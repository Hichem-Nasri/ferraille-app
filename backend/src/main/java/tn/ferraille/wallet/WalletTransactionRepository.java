package tn.ferraille.wallet;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Optional;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    Page<WalletTransaction> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    Optional<WalletTransaction> findFirstByOrderIdAndType(Long orderId, TxType type);

    Page<WalletTransaction> findByTypeAndStatusOrderByCreatedAtAsc(TxType type, TxStatus status, Pageable pageable);

    @Query("select sum(t.amount) from WalletTransaction t "
            + "where t.user.id = :userId and t.type = :type and t.status in :statuses")
    BigDecimal sumOrNull(@Param("userId") Long userId, @Param("type") TxType type,
                   @Param("statuses") Collection<TxStatus> statuses);

    default BigDecimal sum(Long userId, TxType type, Collection<TxStatus> statuses) {
        BigDecimal value = sumOrNull(userId, type, statuses);
        return value != null ? value : BigDecimal.ZERO;
    }
}
