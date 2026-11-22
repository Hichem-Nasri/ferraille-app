package tn.ferraille.shipping;

public record ShipmentRequest(String orderReference, String pickupName, String pickupPhone, String pickupCity,
                              String recipientName, String recipientPhone, String recipientAddress,
                              String recipientCity, String recipientPostalCode) {
}
