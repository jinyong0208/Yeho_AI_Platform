package com.yeho.ai.platform.service;

import com.yeho.ai.platform.entity.AiModel;
import com.yeho.ai.platform.entity.TenantWallet;
import com.yeho.ai.platform.entity.TenantWalletLog;
import com.yeho.ai.platform.gateway.GatewayException;
import com.yeho.ai.platform.mapper.TenantWalletLogMapper;
import com.yeho.ai.platform.mapper.TenantWalletMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiWalletServiceTest {

    @Mock
    private TenantWalletMapper tenantWalletMapper;

    @Mock
    private TenantWalletLogMapper tenantWalletLogMapper;

    @InjectMocks
    private AiWalletService service;

    @Test
    void calculateChargeCreditsUsesRatesAndCeiling() {
        AiModel model = new AiModel();
        model.setInputCreditRate(new BigDecimal("0.5"));
        model.setOutputCreditRate(new BigDecimal("1.2"));
        model.setBillingMultiplier(new BigDecimal("1.5"));

        assertThat(service.calculateChargeCredits(model, 3, 2)).isEqualTo(6);
    }

    @Test
    void reserveRejectsInsufficientCreditsWithoutMutation() {
        TenantWallet wallet = wallet(1L, 50L, 0L, 0L);
        when(tenantWalletMapper.selectByTenantIdForUpdate(1L)).thenReturn(wallet);

        assertThatThrownBy(() -> service.reserve(1L, 100L, "req-1"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                assertThat(ex.getCode()).isEqualTo("insufficient_credits");
            });

        verify(tenantWalletMapper, never()).updateById(org.mockito.ArgumentMatchers.<TenantWallet>any());
        verify(tenantWalletLogMapper, never()).insert(org.mockito.ArgumentMatchers.<TenantWalletLog>any());
    }

    @Test
    void reserveMovesCreditsFromBalanceToFrozenAndWritesLog() {
        TenantWallet wallet = wallet(1L, 1000L, 0L, 0L);
        when(tenantWalletMapper.selectByTenantIdForUpdate(1L)).thenReturn(wallet);

        long reserved = service.reserve(1L, 300L, "req-1");

        assertThat(reserved).isEqualTo(300L);
        assertThat(wallet.getBalanceCredits()).isEqualTo(700L);
        assertThat(wallet.getFrozenCredits()).isEqualTo(300L);
        verify(tenantWalletMapper).updateById(wallet);

        ArgumentCaptor<TenantWalletLog> logCaptor = ArgumentCaptor.forClass(TenantWalletLog.class);
        verify(tenantWalletLogMapper).insert(logCaptor.capture());
        assertThat(logCaptor.getValue().getDirection()).isEqualTo("RESERVE");
        assertThat(logCaptor.getValue().getAmountCredits()).isEqualTo(300L);
        assertThat(logCaptor.getValue().getBalanceAfter()).isEqualTo(700L);
    }

    @Test
    void settleReleasesUnusedCreditsAndRecordsUsage() {
        TenantWallet wallet = wallet(1L, 0L, 1000L, 10L);
        when(tenantWalletMapper.selectByTenantIdForUpdate(1L)).thenReturn(wallet);

        long charged = service.settle(1L, 1000L, 600L, "req-2");

        assertThat(charged).isEqualTo(600L);
        assertThat(wallet.getBalanceCredits()).isEqualTo(400L);
        assertThat(wallet.getFrozenCredits()).isZero();
        assertThat(wallet.getTotalUsedCredits()).isEqualTo(610L);

        ArgumentCaptor<TenantWalletLog> logCaptor = ArgumentCaptor.forClass(TenantWalletLog.class);
        verify(tenantWalletLogMapper, org.mockito.Mockito.times(2)).insert(logCaptor.capture());
        assertThat(logCaptor.getAllValues())
            .extracting(TenantWalletLog::getDirection)
            .containsExactly("RELEASE", "SETTLE");
    }

    @Test
    void settleRejectsTopUpWhenBalanceIsInsufficient() {
        TenantWallet wallet = wallet(1L, 50L, 100L, 0L);
        when(tenantWalletMapper.selectByTenantIdForUpdate(1L)).thenReturn(wallet);

        assertThatThrownBy(() -> service.settle(1L, 100L, 200L, "req-3"))
            .isInstanceOfSatisfying(GatewayException.class, ex -> {
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                assertThat(ex.getCode()).isEqualTo("insufficient_credits");
            });

        verify(tenantWalletMapper, never()).updateById(org.mockito.ArgumentMatchers.<TenantWallet>any());
        verify(tenantWalletLogMapper, never()).insert(org.mockito.ArgumentMatchers.<TenantWalletLog>any());
    }

    private TenantWallet wallet(Long tenantId, Long balance, Long frozen, Long used) {
        TenantWallet wallet = new TenantWallet();
        wallet.setTenantId(tenantId);
        wallet.setBalanceCredits(balance);
        wallet.setFrozenCredits(frozen);
        wallet.setTotalRechargeCredits(1000L);
        wallet.setTotalUsedCredits(used);
        return wallet;
    }
}
