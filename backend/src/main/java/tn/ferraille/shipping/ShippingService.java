package tn.ferraille.shipping;

import org.springframework.stereotype.Service;
import tn.ferraille.common.ApiException;
import tn.ferraille.common.Money;
import tn.ferraille.config.FerrailleProperties;
import tn.ferraille.config.FerrailleProperties.CarrierSettings;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class ShippingService {

    public record CarrierOption(Carrier carrier, String label, BigDecimal fee, int minDays, int maxDays) {
    }

    private final Map<Carrier, ShippingProvider> providers = new EnumMap<>(Carrier.class);
    private final FerrailleProperties properties;

    public ShippingService(List<ShippingProvider> providers, FerrailleProperties properties) {
        providers.forEach(p -> this.providers.put(p.carrier(), p));
        this.properties = properties;
    }

    public List<CarrierOption> options() {
        return Arrays.stream(Carrier.values())
                .filter(c -> properties.shipping().containsKey(c) && providers.containsKey(c))
                .map(this::option)
                .toList();
    }

    public CarrierOption option(Carrier carrier) {
        CarrierSettings s = properties.shipping().get(carrier);
        if (s == null) {
            throw ApiException.badRequest("Transporteur indisponible");
        }
        return new CarrierOption(carrier, s.label(), Money.of(s.fee()), s.minDays(), s.maxDays());
    }

    public ShipmentResult createShipment(Carrier carrier, ShipmentRequest request) {
        ShippingProvider provider = providers.get(carrier);
        if (provider == null) {
            throw ApiException.badRequest("Transporteur indisponible");
        }
        return provider.createShipment(request);
    }
}
