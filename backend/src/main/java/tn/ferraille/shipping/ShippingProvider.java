package tn.ferraille.shipping;

public interface ShippingProvider {

    Carrier carrier();

    ShipmentResult createShipment(ShipmentRequest request);
}
