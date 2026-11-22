package tn.ferraille.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import tn.ferraille.shipping.Carrier;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "ferraille")
public record FerrailleProperties(
        BigDecimal commissionRate,
        BigDecimal protectionFee,
        BigDecimal cashOnDeliveryFee,
        int autoConfirmHours,
        String uploadDir,
        boolean demoData,
        List<String> corsOrigins,
        String adminEmail,
        String adminPassword,
        Jwt jwt,
        Map<Carrier, CarrierSettings> shipping
) {

    public record Jwt(String secret, long expirationMinutes) {
    }

    public record CarrierSettings(String label, BigDecimal fee, int minDays, int maxDays) {
    }
}
