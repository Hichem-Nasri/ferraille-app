package tn.ferraille.wallet;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.common.Money;
import tn.ferraille.common.PageResponse;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.listing.ListingStatus;
import tn.ferraille.order.Order;
import tn.ferraille.order.OrderRepository;
import tn.ferraille.order.OrderStatus;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WalletService {

    public static final BigDecimal MIN_PAYOUT = new BigDecimal("20.000");

    public record TransactionDto(Long id, TxType type, TxStatus status, BigDecimal amount, BigDecimal commission,
                                 String label, String orderReference, PayoutMethod payoutMethod, Instant createdAt) {

        static TransactionDto from(WalletTransaction t) {
            return new TransactionDto(t.getId(), t.getType(), t.getStatus(), t.getAmount(), t.getCommission(),
                    t.getLabel(), t.getOrder() != null ? t.getOrder().getReference() : null,
                    t.getPayoutMethod(), t.getCreatedAt());
        }
    }

    public record WalletSummary(BigDecimal available, BigDecimal pending, long salesCount, long activeListings,
                                long totalViews, List<TransactionDto> recent) {
    }

    public record PayoutRequest(@NotNull @DecimalMin("20.000") BigDecimal amount,
                                @NotNull PayoutMethod method,
                                @NotBlank @Size(max = 60) String destination) {
    }

    private final WalletTransactionRepository repository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;

    @Transactional(readOnly = true)
    public WalletSummary summary(Long userId) {
        List<TransactionDto> recent = repository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, 10))
                .map(TransactionDto::from).getContent();
        return new WalletSummary(available(userId), pending(userId),
                orderRepository.countBySellerIdAndStatus(userId, OrderStatus.COMPLETED),
                listingRepository.countBySellerIdAndStatus(userId, ListingStatus.ACTIVE),
                listingRepository.sumViewsBySeller(userId), recent);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionDto> history(Long userId, int page, int size) {
        return PageResponse.of(repository.findByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(page, size)),
                TransactionDto::from);
    }

    @Transactional
    public TransactionDto requestPayout(Long userId, PayoutRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        BigDecimal amount = Money.of(request.amount());
        if (amount.compareTo(MIN_PAYOUT) < 0) {
            throw ApiException.badRequest("Retrait minimum : 20 DT");
        }
        if (amount.compareTo(available(userId)) > 0) {
            throw ApiException.badRequest("Solde insuffisant");
        }
        WalletTransaction tx = new WalletTransaction();
        tx.setUser(user);
        tx.setType(TxType.PAYOUT);
        tx.setStatus(TxStatus.REQUESTED);
        tx.setAmount(amount.negate());
        tx.setCommission(Money.zero());
        tx.setPayoutMethod(request.method());
        tx.setPayoutDestination(request.destination().trim());
        tx.setLabel(request.method() == PayoutMethod.D17 ? "Retrait D17" : "Retrait par virement");
        repository.save(tx);
        return TransactionDto.from(tx);
    }

    @Transactional
    public void markPayoutPaid(Long txId) {
        WalletTransaction tx = repository.findById(txId).orElseThrow(() -> ApiException.notFound("Retrait introuvable"));
        if (tx.getType() != TxType.PAYOUT || tx.getStatus() != TxStatus.REQUESTED) {
            throw ApiException.conflict("Ce retrait ne peut pas être validé");
        }
        tx.setStatus(TxStatus.PAID);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionDto> pendingPayouts(int page, int size) {
        return PageResponse.of(repository.findByTypeAndStatusOrderByCreatedAtAsc(TxType.PAYOUT, TxStatus.REQUESTED,
                PageRequest.of(page, size)), TransactionDto::from);
    }

    public void recordPendingSale(Order order) {
        WalletTransaction tx = new WalletTransaction();
        tx.setUser(order.getSeller());
        tx.setOrder(order);
        tx.setType(TxType.SALE);
        tx.setStatus(TxStatus.PENDING);
        tx.setAmount(order.getSellerNet());
        tx.setCommission(order.getCommission());
        tx.setLabel(order.getListing().getTitle());
        repository.save(tx);
    }

    public void releaseSale(Order order) {
        repository.findFirstByOrderIdAndType(order.getId(), TxType.SALE).ifPresent(tx -> tx.setStatus(TxStatus.AVAILABLE));
    }

    public void cancelSale(Order order) {
        repository.findFirstByOrderIdAndType(order.getId(), TxType.SALE).ifPresent(tx -> tx.setStatus(TxStatus.CANCELLED));
    }

    private BigDecimal available(Long userId) {
        BigDecimal credits = repository.sum(userId, TxType.SALE, EnumSet.of(TxStatus.AVAILABLE));
        BigDecimal payouts = repository.sum(userId, TxType.PAYOUT, EnumSet.of(TxStatus.REQUESTED, TxStatus.PAID));
        return Money.of(credits.add(payouts));
    }

    private BigDecimal pending(Long userId) {
        return Money.of(repository.sum(userId, TxType.SALE, EnumSet.of(TxStatus.PENDING)));
    }
}
