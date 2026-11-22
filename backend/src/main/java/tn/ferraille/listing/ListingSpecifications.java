package tn.ferraille.listing;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import tn.ferraille.user.SellerType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class ListingSpecifications {

    private ListingSpecifications() {
    }

    public record Filter(String q, Category category, PartCondition condition, String make, String model,
                         Integer year, String city, BigDecimal minPrice, BigDecimal maxPrice,
                         Boolean proOnly) {
    }

    public static Specification<Listing> search(Filter f) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), ListingStatus.ACTIVE));

            if (notBlank(f.q())) {
                String like = "%" + f.q().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("title")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("oemReference"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("description"), "")), like)));
            }
            if (f.category() != null) {
                predicates.add(cb.equal(root.get("category"), f.category()));
            }
            if (f.condition() != null) {
                predicates.add(cb.equal(root.get("condition"), f.condition()));
            }
            if (notBlank(f.city())) {
                predicates.add(cb.equal(cb.lower(root.<String>get("city")), f.city().trim().toLowerCase(Locale.ROOT)));
            }
            if (f.minPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), f.minPrice()));
            }
            if (f.maxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), f.maxPrice()));
            }
            if (Boolean.TRUE.equals(f.proOnly())) {
                predicates.add(cb.equal(root.get("seller").get("sellerType"), SellerType.PRO));
            }
            if (notBlank(f.make()) || notBlank(f.model()) || f.year() != null) {
                Subquery<Long> sub = query.subquery(Long.class);
                var subRoot = sub.from(Listing.class);
                Join<Listing, VehicleFit> fit = subRoot.join("fits");
                List<Predicate> fitPredicates = new ArrayList<>();
                fitPredicates.add(cb.equal(subRoot.get("id"), root.get("id")));
                if (notBlank(f.make())) {
                    fitPredicates.add(cb.equal(cb.lower(fit.<String>get("make")), f.make().trim().toLowerCase(Locale.ROOT)));
                }
                if (notBlank(f.model())) {
                    fitPredicates.add(cb.equal(cb.lower(fit.<String>get("model")), f.model().trim().toLowerCase(Locale.ROOT)));
                }
                if (f.year() != null) {
                    fitPredicates.add(cb.or(cb.isNull(fit.get("yearFrom")), cb.lessThanOrEqualTo(fit.get("yearFrom"), f.year())));
                    fitPredicates.add(cb.or(cb.isNull(fit.get("yearTo")), cb.greaterThanOrEqualTo(fit.get("yearTo"), f.year())));
                }
                sub.select(subRoot.get("id")).where(fitPredicates.toArray(Predicate[]::new));
                predicates.add(cb.exists(sub));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
