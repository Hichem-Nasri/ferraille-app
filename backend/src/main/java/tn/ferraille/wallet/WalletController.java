package tn.ferraille.wallet;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.security.AuthenticatedUser;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public WalletService.WalletSummary summary(@AuthenticationPrincipal AuthenticatedUser user) {
        return walletService.summary(user.id());
    }

    @GetMapping("/transactions")
    public PageResponse<WalletService.TransactionDto> history(@AuthenticationPrincipal AuthenticatedUser user,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return walletService.history(user.id(), Math.max(page, 0), Math.min(Math.max(size, 1), 50));
    }

    @PostMapping("/payouts")
    @ResponseStatus(HttpStatus.CREATED)
    public WalletService.TransactionDto payout(@AuthenticationPrincipal AuthenticatedUser user,
                                               @Valid @RequestBody WalletService.PayoutRequest request) {
        return walletService.requestPayout(user.id(), request);
    }
}
