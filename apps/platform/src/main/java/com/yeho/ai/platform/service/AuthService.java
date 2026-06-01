package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.dto.auth.LoginRequest;
import com.yeho.ai.platform.dto.auth.LoginResponse;
import com.yeho.ai.platform.dto.user.SelfPasswordChangeRequest;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantUser;
import com.yeho.ai.platform.mapper.SysRoleMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantUserMapper;
import com.yeho.ai.platform.security.AuthenticatedUser;
import com.yeho.ai.platform.security.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final TenantMapper tenantMapper;
    private final TenantUserMapper tenantUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final CaptchaService captchaService;

    @Value("${yeho.security.token-ttl-hours:12}")
    private long tokenTtlHours;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        captchaService.validate(request.getCaptchaId(), request.getCaptchaAnswer());

        Tenant tenant = tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
            .eq(Tenant::getTenantCode, request.getTenantCode())
            .eq(Tenant::getStatus, "ACTIVE"));
        if (tenant == null) {
            throw new BusinessException("Tenant or user is invalid");
        }

        TenantUser user = tenantUserMapper.selectOne(new LambdaQueryWrapper<TenantUser>()
            .eq(TenantUser::getTenantId, tenant.getId())
            .eq(TenantUser::getUsername, request.getUsername())
            .eq(TenantUser::getStatus, "ACTIVE"));
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Tenant or user is invalid");
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        tenantUserMapper.updateById(user);

        List<String> roles = sysRoleMapper.findRoleCodesByUserId(user.getId());
        String token = tokenService.create(user, roles);
        long effectiveTokenTtlHours = tokenTtlHours > 0 ? tokenTtlHours : 12;
        return new LoginResponse(
            "Bearer",
            token,
            effectiveTokenTtlHours * 3600,
            tenant.getId(),
            tenant.getTenantCode(),
            tenant.getTenantName(),
            user.getId(),
            user.getUsername(),
            roles
        );
    }

    @Transactional
    public void changeOwnPassword(AuthenticatedUser principal, SelfPasswordChangeRequest request) {
        if (principal == null) {
            throw new BusinessException("Access denied");
        }
        TenantUser user = tenantUserMapper.selectOne(new LambdaQueryWrapper<TenantUser>()
            .eq(TenantUser::getId, principal.userId())
            .eq(TenantUser::getTenantId, principal.tenantId())
            .eq(TenantUser::getStatus, "ACTIVE"));
        if (user == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        tenantUserMapper.updateById(user);
    }
}
