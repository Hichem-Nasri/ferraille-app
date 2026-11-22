package tn.ferraille.shipping;

import org.springframework.stereotype.Component;

@Component
public class AramexShippingProvider extends SimulatedShippingProvider {

    @Override
    public Carrier carrier() {
        return Carrier.ARAMEX;
    }

    @Override
    protected String prefix() {
        return "AX";
    }
}
