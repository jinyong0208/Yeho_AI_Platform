package com.yeho.ai.platform.bootstrap;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.entity.SysRole;
import com.yeho.ai.platform.entity.SysUserRole;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantUser;
import com.yeho.ai.platform.mapper.SysRoleMapper;
import com.yeho.ai.platform.mapper.SysUserRoleMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantUserMapper;
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
    private final PasswordEncoder passwordEncoder;

    @Value("${yeho.security.default-admin-password}")
    private String defaultAdminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
        seedDefaultTenantAndAdmin();
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

    private record RoleSeed(String code, String name) {
    }
}
