package tn.ferraille.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ListingRepository extends JpaRepository<Listing, Long>, JpaSpecificationExecutor<Listing> {

    Page<Listing> findBySellerIdAndStatusNotOrderByCreatedAtDesc(Long sellerId, ListingStatus status, Pageable pageable);

    long countBySellerIdAndStatus(Long sellerId, ListingStatus status);

    @Modifying
    @Query("update Listing l set l.views = l.views + 1 where l.id = :id")
    void incrementViews(@Param("id") Long id);

    @Query("select sum(l.views) from Listing l where l.seller.id = :sellerId")
    Long sumViewsOrNull(@Param("sellerId") Long sellerId);

    default long sumViewsBySeller(Long sellerId) {
        Long value = sumViewsOrNull(sellerId);
        return value != null ? value : 0L;
    }
}
