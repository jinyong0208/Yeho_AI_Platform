package com.yeho.ai.platform.service;

import com.yeho.ai.platform.common.BusinessException;
import com.yeho.ai.platform.entity.AiModel;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ModelPricingPolicyService {

    @Value("${yeho.billing.minimum-margin-multiplier:1.20}")
    private BigDecimal minimumMarginMultiplier;

    public void validate(AiModel model) {
        BigDecimal multiplier = positiveOrOne(model.getBillingMultiplier());
        validateRate("Input", model.getInputPrice(), model.getInputCreditRate(), multiplier);
        validateRate("Output", model.getOutputPrice(), model.getOutputCreditRate(), multiplier);
    }

    private void validateRate(String direction, BigDecimal providerCostRate, BigDecimal customerCreditRate, BigDecimal multiplier) {
        BigDecimal costRate = nonNegative(providerCostRate, direction + " provider cost rate");
        BigDecimal salesRate = nonNegative(customerCreditRate, direction + " customer credit rate");
        BigDecimal effectiveSalesRate = salesRate.multiply(multiplier);
        BigDecimal minimumSalesRate = costRate.multiply(minimumMargin());

        if (costRate.compareTo(BigDecimal.ZERO) > 0 && effectiveSalesRate.compareTo(minimumSalesRate) < 0) {
            throw new BusinessException(direction + " customer credit rate is below provider cost margin floor");
        }
    }

    private BigDecimal nonNegative(BigDecimal value, String fieldName) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(fieldName + " cannot be negative");
        }
        return normalized;
    }

    private BigDecimal positiveOrOne(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ONE;
        }
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Billing multiplier must be greater than 0");
        }
        return value;
    }

    private BigDecimal minimumMargin() {
        if (minimumMarginMultiplier == null || minimumMarginMultiplier.compareTo(BigDecimal.ONE) < 0) {
            return BigDecimal.ONE;
        }
        return minimumMarginMultiplier;
    }
}
