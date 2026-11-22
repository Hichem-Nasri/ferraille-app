package tn.ferraille.order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.order.OrderDtos.CreateOrderRequest;
import tn.ferraille.order.OrderDtos.DisputeRequest;
import tn.ferraille.order.OrderDtos.OrderDetail;
import tn.ferraille.order.OrderDtos.OrderSummary;
import tn.ferraille.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDetail create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(user.id(), request);
    }

    @GetMapping
    public PageResponse<OrderSummary> mine(@AuthenticationPrincipal AuthenticatedUser user,
                                           @RequestParam(defaultValue = "buyer") String role,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return orderService.mine(user.id(), role, Math.max(page, 0), Math.min(Math.max(size, 1), 50));
    }

    @GetMapping("/{id}")
    public OrderDetail get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.get(user.id(), "ADMIN".equals(user.role()), id);
    }

    @PostMapping("/{id}/ship")
    public OrderDetail ship(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.ship(user.id(), id);
    }

    @PostMapping("/{id}/confirm")
    public OrderDetail confirm(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.confirm(user.id(), id);
    }

    @PostMapping("/{id}/dispute")
    public OrderDetail dispute(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
                               @Valid @RequestBody DisputeRequest request) {
        return orderService.dispute(user.id(), id, request.reason());
    }

    @PostMapping("/{id}/cancel")
    public OrderDetail cancel(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.cancel(user.id(), id);
    }
}
