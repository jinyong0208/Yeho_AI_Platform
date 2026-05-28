package com.yeho.ai.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yeho.ai.platform.entity.TenantRechargeOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface TenantRechargeOrderMapper extends BaseMapper<TenantRechargeOrder> {
    @Select("SELECT * FROM tenant_recharge_order WHERE id = #{id} FOR UPDATE")
    TenantRechargeOrder selectByIdForUpdate(@Param("id") Long id);
}
