package tn.ferraille.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.order.OrderDtos.OrderDetail;
import tn.ferraille.order.OrderDtos.OrderSummary;
import tn.ferraille.order.OrderDtos.ResolveDisputeRequest;
import tn.ferraille.order.OrderDtos.StatusUpdateRequest;
import tn.ferraille.order.OrderService;
import tn.ferraille.order.OrderStatus;
import tn.ferraille.wallet.WalletService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final WalletService walletService;

    @GetMapping("/orders")
    public PageResponse<OrderSummary> orders(@RequestParam OrderStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return orderService.byStatus(status, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/orders/{id}/delivery-status")
    public OrderDetail deliveryStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return orderService.updateDeliveryStatus(id, request.status(), request.location());
    }

    @PostMapping("/orders/{id}/resolve")
    public OrderDetail resolve(@PathVariable Long id, @RequestBody ResolveDisputeRequest request) {
        return orderService.resolveDispute(id, request.refundBuyer());
    }

    @GetMapping("/payouts")
    public PageResponse<WalletService.TransactionDto> payouts(@RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return walletService.pendingPayouts(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/payouts/{id}/paid")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void payoutPaid(@PathVariable Long id) {
        walletService.markPayoutPaid(id);
    }
}
