package com.yeho.ai.platform.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.common.NotFoundException;
import com.yeho.ai.platform.dto.user.AdminPasswordResetRequest;
import com.yeho.ai.platform.dto.user.UserCreateRequest;
import com.yeho.ai.platform.dto.user.UserResponse;
import com.yeho.ai.platform.dto.user.UserUpdateRequest;
import com.yeho.ai.platform.entity.SysRole;
import com.yeho.ai.platform.entity.SysUserRole;
import com.yeho.ai.platform.entity.Tenant;
import com.yeho.ai.platform.entity.TenantUser;
import com.yeho.ai.platform.mapper.SysRoleMapper;
import com.yeho.ai.platform.mapper.SysUserRoleMapper;
import com.yeho.ai.platform.mapper.TenantMapper;
import com.yeho.ai.platform.mapper.TenantUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantUserService {
    private final TenantMapper tenantMapper;
    private final TenantUserMapper tenantUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse create(Long tenantId, UserCreateRequest request) {
        ensureTenantExists(tenantId);
        long count = tenantUserMapper.selectCount(new LambdaQueryWrapper<TenantUser>()
            .eq(TenantUser::getTenantId, tenantId)
            .eq(TenantUser::getUsername, request.getUsername()));
        if (count > 0) {
            throw new BusinessException("Username already exists in tenant");
        }

        LocalDateTime now = LocalDateTime.now();
        TenantUser user = new TenantUser();
        user.setTenantId(tenantId);
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        tenantUserMapper.insert(user);
        syncRoles(user.getId(), request.getRoleCodes());
        return toResponse(user);
    }

    public List<UserResponse> list(Long tenantId) {
        ensureTenantExists(tenantId);
        return tenantUserMapper.selectList(new LambdaQueryWrapper<TenantUser>()
                .eq(TenantUser::getTenantId, tenantId)
                .ne(TenantUser::getStatus, "DELETED")
                .orderByDesc(TenantUser::getCreatedAt))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public UserResponse get(Long tenantId, Long userId) {
        return toResponse(findUser(tenantId, userId));
    }

    @Transactional
    public UserResponse update(Long tenantId, Long userId, UserUpdateRequest request) {
        TenantUser user = findUser(tenantId, userId);
        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (StringUtils.hasText(request.getDisplayName())) {
            user.setDisplayName(request.getDisplayName());
        }
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        if (StringUtils.hasText(request.getStatus())) {
            user.setStatus(request.getStatus());
        }
        user.setUpdatedAt(LocalDateTime.now());
        tenantUserMapper.updateById(user);
        syncRoles(user.getId(), request.getRoleCodes());
        return toResponse(user);
    }

    @Transactional
    public void resetPassword(Long tenantId, Long userId, AdminPasswordResetRequest request) {
        TenantUser user = findUser(tenantId, userId);
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        tenantUserMapper.updateById(user);
    }

    @Transactional
    public void delete(Long tenantId, Long userId) {
        TenantUser user = findUser(tenantId, userId);
        user.setStatus("DELETED");
        user.setUpdatedAt(LocalDateTime.now());
        tenantUserMapper.updateById(user);
    }

    private void ensureTenantExists(Long tenantId) {
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null || "DELETED".equals(tenant.getStatus())) {
            throw new NotFoundException("Tenant not found");
        }
    }

    private TenantUser findUser(Long tenantId, Long userId) {
        TenantUser user = tenantUserMapper.selectOne(new LambdaQueryWrapper<TenantUser>()
            .eq(TenantUser::getId, userId)
            .eq(TenantUser::getTenantId, tenantId)
            .ne(TenantUser::getStatus, "DELETED"));
        if (user == null) {
            throw new NotFoundException("User not found");
        }
        return user;
    }

    private void syncRoles(Long userId, List<String> roleCodes) {
        if (roleCodes == null) {
            return;
        }
        sysUserRoleMapper.delete(new LambdaUpdateWrapper<SysUserRole>()
            .eq(SysUserRole::getUserId, userId));
        for (String roleCode : roleCodes) {
            SysRole role = sysRoleMapper.selectOne(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, roleCode));
            if (role == null) {
                throw new BusinessException("Role does not exist: " + roleCode);
            }
            SysUserRole userRole = new SysUserRole();
            userRole.setUserId(userId);
            userRole.setRoleId(role.getId());
            userRole.setCreatedAt(LocalDateTime.now());
            sysUserRoleMapper.insert(userRole);
        }
    }

    private UserResponse toResponse(TenantUser user) {
        return new UserResponse(
            user.getId(),
            user.getTenantId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getPhone(),
            user.getStatus(),
            sysRoleMapper.findRoleCodesByUserId(user.getId()),
            user.getLastLoginAt(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
