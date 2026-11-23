package tn.ferraille.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findTop20BySellerIdOrderByCreatedAtDesc(Long sellerId);

    Optional<Review> findBySellerIdAndAuthorId(Long sellerId, Long authorId);

    @Query("select avg(r.rating) from Review r where r.seller.id = :sellerId")
    Double averageRating(@Param("sellerId") Long sellerId);

    long countBySellerId(Long sellerId);
}
