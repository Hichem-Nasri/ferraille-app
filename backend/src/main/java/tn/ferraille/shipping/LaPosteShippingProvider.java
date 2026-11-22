package tn.ferraille.shipping;

import org.springframework.stereotype.Component;

@Component
public class LaPosteShippingProvider extends SimulatedShippingProvider {

    @Override
    public Carrier carrier() {
        return Carrier.LA_POSTE;
    }

    @Override
    protected String prefix() {
        return "RP";
    }
}
