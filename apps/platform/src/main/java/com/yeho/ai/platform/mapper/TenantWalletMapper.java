package com.yeho.ai.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yeho.ai.platform.entity.TenantWallet;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface TenantWalletMapper extends BaseMapper<TenantWallet> {
    @Select("SELECT * FROM tenant_wallet WHERE tenant_id = #{tenantId} FOR UPDATE")
    TenantWallet selectByTenantIdForUpdate(@Param("tenantId") Long tenantId);
}
