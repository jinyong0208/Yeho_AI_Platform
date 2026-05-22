package com.yeho.ai.platform.bootstrap;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.AiModelPriceVersion;
import com.yeho.ai.platform.entity.AiProvider;
import com.yeho.ai.platform.entity.SysRole;
import com.yeho.ai.platform.entity.SysUserRole;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantApiKey;
import com.yeho.ai.platform.entity.TenantWallet;
import com.yeho.ai.platform.entity.TenantUser;
import com.yeho.ai.platform.mapper.AiModelMapper;
import com.yeho.ai.platform.mapper.AiModelPriceVersionMapper;
import com.yeho.ai.platform.mapper.AiProviderMapper;
import com.yeho.ai.platform.mapper.SysRoleMapper;
import com.yeho.ai.platform.mapper.SysUserRoleMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantApiKeyMapper;
import com.yeho.ai.platform.mapper.TenantWalletMapper;
import com.yeho.ai.platform.mapper.TenantUserMapper;
import com.yeho.ai.platform.security.ApiKeyHashService;
import com.yeho.ai.platform.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class StartupDataInitializer implements ApplicationRunner {
    private static final List<RoleSeed> ROLE_SEEDS = List.of(
        new RoleSeed("SUPER_ADMIN", "Super Admin"),
        new RoleSeed("TENANT_ADMIN", "Tenant Admin"),
        new RoleSeed("DEVELOPER", "Developer"),
        new RoleSeed("FINANCE", "Finance"),
        new RoleSeed("VIEWER", "Viewer")
    );

    private final TenantMapper tenantMapper;
    private final TenantUserMapper tenantUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final TenantWalletMapper tenantWalletMapper;
    private final TenantApiKeyMapper tenantApiKeyMapper;
    private final AiProviderMapper aiProviderMapper;
    private final AiModelMapper aiModelMapper;
    private final AiModelPriceVersionMapper aiModelPriceVersionMapper;
    private final SecretCryptoService secretCryptoService;
    private final ApiKeyHashService apiKeyHashService;
    private final PasswordEncoder passwordEncoder;

    @Value("${yeho.security.default-admin-password}")
    private String defaultAdminPassword;

    @Value("${yeho.billing.default-wallet-credits:100000}")
    private long defaultWalletCredits;

    @Value("${yeho.gateway.demo-api-key:yh_sk_demo_default_key}")
    private String demoApiKey;

    @Value("${yeho.gateway.mock-provider-base-url:http://localhost:8080/mock-provider}")
    private String mockProviderBaseUrl;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
        seedDefaultTenantAndAdmin();
        seedDefaultWallet();
        seedGatewayDemoData();
    }

    private void seedRoles() {
        for (RoleSeed seed : ROLE_SEEDS) {
            long count = sysRoleMapper.selectCount(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, seed.code()));
            if (count == 0) {
                LocalDateTime now = LocalDateTime.now();
                SysRole role = new SysRole();
                role.setRoleCode(seed.code());
                role.setRoleName(seed.name());
                role.setDescription("System role: " + seed.code());
                role.setCreatedAt(now);
                role.setUpdatedAt(now);
                sysRoleMapper.insert(role);
            }
        }
    }

    private void seedDefaultTenantAndAdmin() {
        Tenant tenant = tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
            .eq(Tenant::getTenantCode, "default"));
        if (tenant == null) {
            LocalDateTime now = LocalDateTime.now();
            tenant = new Tenant();
            tenant.setTenantCode("default");
            tenant.setTenantName("Default Tenant");
            tenant.setStatus("ACTIVE");
            tenant.setCreatedAt(now);
            tenant.setUpdatedAt(now);
            tenantMapper.insert(tenant);
        }

        TenantUser admin = tenantUserMapper.selectOne(new LambdaQueryWrapper<TenantUser>()
            .eq(TenantUser::getTenantId, tenant.getId())
            .eq(TenantUser::getUsername, "admin"));
        if (admin == null) {
            LocalDateTime now = LocalDateTime.now();
            admin = new TenantUser();
            admin.setTenantId(tenant.getId());
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode(defaultAdminPassword));
            admin.setDisplayName("System Admin");
            admin.setStatus("ACTIVE");
            admin.setCreatedAt(now);
            admin.setUpdatedAt(now);
            tenantUserMapper.insert(admin);
        }

        SysRole superAdmin = sysRoleMapper.selectOne(new LambdaQueryWrapper<SysRole>()
            .eq(SysRole::getRoleCode, "SUPER_ADMIN"));
        long linkCount = sysUserRoleMapper.selectCount(new LambdaQueryWrapper<SysUserRole>()
            .eq(SysUserRole::getUserId, admin.getId())
            .eq(SysUserRole::getRoleId, superAdmin.getId()));
        if (linkCount == 0) {
            SysUserRole link = new SysUserRole();
            link.setUserId(admin.getId());
            link.setRoleId(superAdmin.getId());
            link.setCreatedAt(LocalDateTime.now());
            sysUserRoleMapper.insert(link);
        }
    }

    private void seedDefaultWallet() {
        Tenant tenant = tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
            .eq(Tenant::getTenantCode, "default"));
        if (tenant == null) {
            return;
        }

        TenantWallet wallet = tenantWalletMapper.selectOne(new LambdaQueryWrapper<TenantWallet>()
            .eq(TenantWallet::getTenantId, tenant.getId()));
        if (wallet == null) {
            LocalDateTime now = LocalDateTime.now();
            wallet = new TenantWallet();
            wallet.setTenantId(tenant.getId());
            wallet.setBalanceCredits(defaultWalletCredits);
            wallet.setFrozenCredits(0L);
            wallet.setTotalRechargeCredits(defaultWalletCredits);
            wallet.setTotalUsedCredits(0L);
            wallet.setUpdatedAt(now);
            tenantWalletMapper.insert(wallet);
        }
    }

    private void seedGatewayDemoData() {
        Tenant tenant = tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
            .eq(Tenant::getTenantCode, "default"));
        if (tenant == null) {
            return;
        }

        AiProvider deepSeekProvider = upsertProvider(
            "DEEPSEEK",
            "DeepSeek",
            mockProviderBaseUrl,
            "demo-provider-secret"
        );
        AiProvider qwenProvider = upsertProvider(
            "QWEN",
            "Qwen",
            mockProviderBaseUrl,
            "demo-provider-secret"
        );

        upsertModel(
            deepSeekProvider.getId(),
            "deepseek-chat",
            "DeepSeek Chat",
            1,
            2,
            1,
            2
        );
        upsertModel(
            qwenProvider.getId(),
            "qwen-plus",
            "Qwen Plus",
            1,
            2,
            1,
            2
        );

        TenantApiKey apiKey = tenantApiKeyMapper.selectOne(new LambdaQueryWrapper<TenantApiKey>()
            .eq(TenantApiKey::getApiKeyHash, apiKeyHashService.hash(demoApiKey)));
        if (apiKey == null) {
            LocalDateTime now = LocalDateTime.now();
            apiKey = new TenantApiKey();
            apiKey.setTenantId(tenant.getId());
            apiKey.setApiKeyHash(apiKeyHashService.hash(demoApiKey));
            apiKey.setApiKeyPrefix(apiKeyHashService.prefix(demoApiKey));
            apiKey.setName("Demo API Key");
            apiKey.setScopes("admin:*,chat:completion,usage:read,billing:read,provider:test");
            apiKey.setStatus("ACTIVE");
            apiKey.setCreatedAt(now);
            tenantApiKeyMapper.insert(apiKey);
        }
    }

    private AiProvider upsertProvider(String providerCode, String providerName, String baseUrl, String apiKeyPlain) {
        AiProvider provider = aiProviderMapper.selectOne(new LambdaQueryWrapper<AiProvider>()
            .eq(AiProvider::getProviderCode, providerCode));
        LocalDateTime now = LocalDateTime.now();
        if (provider == null) {
            provider = new AiProvider();
            provider.setProviderCode(providerCode);
            provider.setProviderName(providerName);
            provider.setBaseUrl(baseUrl);
            provider.setApiKeyEncrypted(secretCryptoService.encrypt(apiKeyPlain));
            provider.setStatus("ACTIVE");
            provider.setTimeoutMs(120000);
            provider.setRetryCount(0);
            provider.setCircuitFailureThreshold(5);
            provider.setCircuitCooldownSeconds(60);
            provider.setHealthStatus("UNKNOWN");
            provider.setConsecutiveFailures(0);
            provider.setCreatedAt(now);
            provider.setUpdatedAt(now);
            aiProviderMapper.insert(provider);
            return provider;
        }

        provider.setProviderName(providerName);
        provider.setBaseUrl(baseUrl);
        provider.setApiKeyEncrypted(secretCryptoService.encrypt(apiKeyPlain));
        provider.setStatus("ACTIVE");
        provider.setTimeoutMs(provider.getTimeoutMs() == null ? 120000 : provider.getTimeoutMs());
        provider.setRetryCount(provider.getRetryCount() == null ? 0 : provider.getRetryCount());
        provider.setCircuitFailureThreshold(provider.getCircuitFailureThreshold() == null ? 5 : provider.getCircuitFailureThreshold());
        provider.setCircuitCooldownSeconds(provider.getCircuitCooldownSeconds() == null ? 60 : provider.getCircuitCooldownSeconds());
        provider.setHealthStatus(provider.getHealthStatus() == null ? "UNKNOWN" : provider.getHealthStatus());
        provider.setConsecutiveFailures(provider.getConsecutiveFailures() == null ? 0 : provider.getConsecutiveFailures());
        provider.setUpdatedAt(now);
        aiProviderMapper.updateById(provider);
        return provider;
    }

    private void upsertModel(Long providerId, String modelCode, String displayName, int inputRate, int outputRate, int inputPrice, int outputPrice) {
        AiModel model = aiModelMapper.selectOne(new LambdaQueryWrapper<AiModel>()
            .eq(AiModel::getModelCode, modelCode));
        LocalDateTime now = LocalDateTime.now();
        if (model == null) {
            model = new AiModel();
            model.setProviderId(providerId);
            model.setModelCode(modelCode);
            model.setDisplayName(displayName);
            model.setInputPrice(java.math.BigDecimal.valueOf(inputPrice));
            model.setOutputPrice(java.math.BigDecimal.valueOf(outputPrice));
            model.setInputCreditRate(java.math.BigDecimal.valueOf(inputRate));
            model.setOutputCreditRate(java.math.BigDecimal.valueOf(outputRate));
            model.setBillingMultiplier(java.math.BigDecimal.ONE);
            model.setSupportStream(Boolean.TRUE);
            model.setSupportToolCall(Boolean.FALSE);
            model.setStatus("ACTIVE");
            model.setCreatedAt(now);
            model.setUpdatedAt(now);
            aiModelMapper.insert(model);
            ensurePriceVersion(model, "Startup initial price version");
            return;
        }

        model.setProviderId(providerId);
        model.setDisplayName(displayName);
        if (model.getInputPrice() == null) {
            model.setInputPrice(java.math.BigDecimal.valueOf(inputPrice));
        }
        if (model.getOutputPrice() == null) {
            model.setOutputPrice(java.math.BigDecimal.valueOf(outputPrice));
        }
        if (model.getInputCreditRate() == null) {
            model.setInputCreditRate(java.math.BigDecimal.valueOf(inputRate));
        }
        if (model.getOutputCreditRate() == null) {
            model.setOutputCreditRate(java.math.BigDecimal.valueOf(outputRate));
        }
        if (model.getBillingMultiplier() == null) {
            model.setBillingMultiplier(java.math.BigDecimal.ONE);
        }
        model.setSupportStream(Boolean.TRUE);
        model.setSupportToolCall(Boolean.FALSE);
        model.setStatus("ACTIVE");
        model.setUpdatedAt(now);
        aiModelMapper.updateById(model);
        ensurePriceVersion(model, "Startup initial price version");
    }

    private void ensurePriceVersion(AiModel model, String remark) {
        if (model.getCurrentPriceVersionId() != null) {
            return;
        }
        AiModelPriceVersion latest = aiModelPriceVersionMapper.selectOne(new LambdaQueryWrapper<AiModelPriceVersion>()
            .eq(AiModelPriceVersion::getModelId, model.getId())
            .orderByDesc(AiModelPriceVersion::getVersionNo)
            .last("LIMIT 1"));
        if (latest == null) {
            LocalDateTime now = LocalDateTime.now();
            latest = new AiModelPriceVersion();
            latest.setModelId(model.getId());
            latest.setVersionNo(1);
            latest.setInputPrice(model.getInputPrice() == null ? java.math.BigDecimal.ZERO : model.getInputPrice());
            latest.setOutputPrice(model.getOutputPrice() == null ? java.math.BigDecimal.ZERO : model.getOutputPrice());
            latest.setInputCreditRate(model.getInputCreditRate() == null ? java.math.BigDecimal.ZERO : model.getInputCreditRate());
            latest.setOutputCreditRate(model.getOutputCreditRate() == null ? java.math.BigDecimal.ZERO : model.getOutputCreditRate());
            latest.setBillingMultiplier(model.getBillingMultiplier() == null ? java.math.BigDecimal.ONE : model.getBillingMultiplier());
            latest.setEffectiveAt(now);
            latest.setRemark(remark);
            latest.setCreatedAt(now);
            latest.setUpdatedAt(now);
            aiModelPriceVersionMapper.insert(latest);
        }
        model.setCurrentPriceVersionId(latest.getId());
        model.setUpdatedAt(LocalDateTime.now());
        aiModelMapper.updateById(model);
    }

    private record RoleSeed(String code, String name) {
    }
}
