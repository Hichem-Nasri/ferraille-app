package tn.ferraille.order;

public enum OrderStatus {
    PAID, SHIPPED, IN_TRANSIT, DELIVERED, COMPLETED, DISPUTED, REFUNDED, CANCELLED;

    public boolean isInDelivery() {
        return this == SHIPPED || this == IN_TRANSIT || this == DELIVERED;
    }
}
