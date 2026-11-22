package tn.ferraille.payment;

public record PaymentResult(boolean success, String reference, String message) {
}
