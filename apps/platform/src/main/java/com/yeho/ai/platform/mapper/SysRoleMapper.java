package com.yeho.ai.platform.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yeho.ai.platform.entity.SysRole;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface SysRoleMapper extends BaseMapper<SysRole> {
    @Select("""
        SELECT r.role_code
        FROM sys_role r
        JOIN sys_user_role ur ON ur.role_id = r.id
        WHERE ur.user_id = #{userId}
        ORDER BY r.role_code
        """)
    List<String> findRoleCodesByUserId(@Param("userId") Long userId);
}
