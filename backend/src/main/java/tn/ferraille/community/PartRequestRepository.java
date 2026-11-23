package tn.ferraille.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PartRequestRepository extends JpaRepository<PartRequest, Long> {

    @Query("select distinct r from PartRequest r, tn.ferraille.listing.Listing l join l.fits f "
            + "where r.status = tn.ferraille.community.PartRequest.Status.OPEN and l.seller.id = :sellerId "
            + "and l.status <> tn.ferraille.listing.ListingStatus.ARCHIVED "
            + "and lower(f.make) = lower(r.make) and r.user.id <> :sellerId order by r.createdAt desc")
    List<PartRequest> findMatchingSeller(@Param("sellerId") Long sellerId, Pageable pageable);

    Page<PartRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByStatus(PartRequest.Status status);
}
