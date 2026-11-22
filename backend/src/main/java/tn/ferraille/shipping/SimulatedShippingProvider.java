package tn.ferraille.shipping;

import java.security.SecureRandom;

abstract class SimulatedShippingProvider implements ShippingProvider {

    private static final SecureRandom RANDOM = new SecureRandom();

    protected abstract String prefix();

    @Override
    public ShipmentResult createShipment(ShipmentRequest request) {
        StringBuilder sb = new StringBuilder(prefix());
        for (int i = 0; i < 10; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return new ShipmentResult(sb.toString(), "Enlèvement demandé à " + request.pickupCity());
    }
}
