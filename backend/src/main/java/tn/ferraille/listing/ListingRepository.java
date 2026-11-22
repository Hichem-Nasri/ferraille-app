package tn.ferraille.listing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long>, JpaSpecificationExecutor<Listing> {

    Page<Listing> findBySellerIdAndStatusNotOrderByCreatedAtDesc(Long sellerId, ListingStatus status, Pageable pageable);

    long countBySellerIdAndStatus(Long sellerId, ListingStatus status);

    List<Listing> findByStatusOrderByUpdatedAtDesc(ListingStatus status, Pageable pageable);

    List<Listing> findByStatusAndCategoryOrderByCreatedAtDesc(ListingStatus status, Category category, Pageable pageable);

    List<Listing> findByStatusOrderByCreatedAtDesc(ListingStatus status, Pageable pageable);

    @Modifying
    @Query("update Listing l set l.status = tn.ferraille.listing.ListingStatus.ARCHIVED where l.seller.id = :sellerId")
    void archiveAllBySeller(@Param("sellerId") Long sellerId);

    @Modifying
    @Query("update Listing l set l.contactClicks = l.contactClicks + 1 where l.id = :id")
    void incrementContactClicks(@Param("id") Long id);

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
