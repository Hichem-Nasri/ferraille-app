package tn.ferraille.community;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.common.PageResponse;
import tn.ferraille.community.CommunityDtos.CasseCard;
import tn.ferraille.community.CommunityDtos.PartRequestCreate;
import tn.ferraille.community.CommunityDtos.PartRequestView;
import tn.ferraille.community.CommunityDtos.ReviewCreate;
import tn.ferraille.community.CommunityDtos.ReviewView;
import tn.ferraille.community.CommunityDtos.SavedSearchCreate;
import tn.ferraille.community.CommunityDtos.SavedSearchView;
import tn.ferraille.community.CommunityDtos.SellerProfile;
import tn.ferraille.listing.Listing;
import tn.ferraille.listing.ListingRepository;
import tn.ferraille.listing.ListingSpecifications;
import tn.ferraille.listing.ListingStatus;
import tn.ferraille.user.SellerType;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private static final int MAX_OPEN_REQUESTS = 10;
    private static final int MAX_SAVED_SEARCHES = 10;

    private final PartRequestRepository requestRepository;
    private final ReviewRepository reviewRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final EntityManager em;

    @Transactional(readOnly = true)
    public PageResponse<PartRequestView> openRequests(String make, String model, String city, Long viewerId, Pageable pageable) {
        StringBuilder where = new StringBuilder(" from PartRequest r where r.status = :status");
        Map<String, Object> params = new HashMap<>();
        params.put("status", PartRequest.Status.OPEN);
        if (notBlank(make)) {
            where.append(" and lower(r.make) = :make");
            params.put("make", make.trim().toLowerCase(Locale.ROOT));
        }
        if (notBlank(model)) {
            where.append(" and lower(r.model) = :model");
            params.put("model", model.trim().toLowerCase(Locale.ROOT));
        }
        if (notBlank(city)) {
            where.append(" and lower(r.city) = :city");
            params.put("city", city.trim().toLowerCase(Locale.ROOT));
        }
        var query = em.createQuery("select r" + where + " order by r.createdAt desc", PartRequest.class);
        var count = em.createQuery("select count(r)" + where, Long.class);
        params.forEach((k, v) -> {
            query.setParameter(k, v);
            count.setParameter(k, v);
        });
        List<PartRequest> rows = query.setFirstResult((int) pageable.getOffset()).setMaxResults(pageable.getPageSize()).getResultList();
        Page<PartRequest> page = new PageImpl<>(rows, pageable, count.getSingleResult());
        return PageResponse.of(page, r -> PartRequestView.from(r, viewerId));
    }

    @Transactional(readOnly = true)
    public List<PartRequestView> requestsForSeller(Long sellerId) {
        return requestRepository.findMatchingSeller(sellerId, PageRequest.of(0, 30)).stream()
                .map(r -> PartRequestView.from(r, sellerId)).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PartRequestView> myRequests(Long userId) {
        return PageResponse.of(requestRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50)),
                r -> PartRequestView.from(r, userId));
    }

    @Transactional
    public PartRequestView createRequest(Long userId, PartRequestCreate body) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        if (!user.hasContact()) {
            throw ApiException.badRequest("Ajoutez un numéro WhatsApp ou de téléphone dans votre profil pour que les casses puissent vous répondre.");
        }
        long open = requestRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 100)).stream()
                .filter(r -> r.getStatus() == PartRequest.Status.OPEN).count();
        if (open >= MAX_OPEN_REQUESTS) {
            throw ApiException.badRequest("Vous avez déjà " + MAX_OPEN_REQUESTS + " demandes ouvertes. Fermez-en une d'abord.");
        }
        int maxYear = java.time.Year.now().getValue() + 1;
        if (body.year() != null && body.year() > maxYear) {
            throw ApiException.badRequest("Année invalide.");
        }
        PartRequest r = new PartRequest();
        r.setUser(user);
        r.setMake(body.make().trim());
        r.setModel(body.model().trim());
        r.setYear(body.year());
        r.setCategory(body.category());
        r.setDescription(body.description().trim());
        r.setCity(notBlank(body.city()) ? body.city().trim() : user.getCity());
        return PartRequestView.from(requestRepository.save(r), userId);
    }

    @Transactional
    public void closeRequest(Long userId, boolean admin, Long id) {
        PartRequest r = requestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Demande introuvable"));
        if (!admin && !r.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Ce n'est pas votre demande.");
        }
        r.setStatus(PartRequest.Status.CLOSED);
    }

    @Transactional(readOnly = true)
    public SellerProfile sellerProfile(Long id) {
        return findSellerProfile(id).orElseThrow(() -> ApiException.notFound("Vendeur introuvable"));
    }

    @Transactional(readOnly = true)
    public java.util.Optional<SellerProfile> findSellerProfile(Long id) {
        return userRepository.findById(id)
                .filter(x -> x.getEmail() != null || x.getFacebookId() != null || x.hasContact())
                .map(this::toProfile);
    }

    private SellerProfile toProfile(User u) {
        Long id = u.getId();
        long count = listingRepository.countBySellerIdAndStatus(id, ListingStatus.ACTIVE);
        return new SellerProfile(u.getId(), u.getDisplayName(), u.getSellerType(), u.isVerified(), u.getCity(),
                u.getAddress(), u.getOpeningHours(), u.getBio(), u.getAvatarUrl(), u.getPhone(), u.getWhatsapp(),
                u.getFacebookUrl(), u.getCreatedAt(), count, round(reviewRepository.averageRating(id)),
                reviewRepository.countBySellerId(id));
    }

    @Transactional(readOnly = true)
    public List<CasseCard> casses(String city) {
        String jpql = "select l.seller.id, count(l) from Listing l where l.status = :status and l.seller.sellerType = :pro"
                + (notBlank(city) ? " and lower(l.seller.city) = :city" : "")
                + " group by l.seller.id";
        var q = em.createQuery(jpql, Object[].class)
                .setParameter("status", ListingStatus.ACTIVE)
                .setParameter("pro", SellerType.PRO);
        if (notBlank(city)) {
            q.setParameter("city", city.trim().toLowerCase(Locale.ROOT));
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : q.getResultList()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        List<CasseCard> cards = new ArrayList<>();
        for (User u : userRepository.findAllById(counts.keySet())) {
            cards.add(new CasseCard(u.getId(), u.getDisplayName(), u.isVerified(), u.getCity(), u.getAddress(),
                    u.getOpeningHours(), u.getAvatarUrl(), u.getPhone(), u.getWhatsapp(), u.getFacebookUrl(),
                    counts.get(u.getId()), round(reviewRepository.averageRating(u.getId())),
                    reviewRepository.countBySellerId(u.getId())));
        }
        cards.sort((a, b) -> {
            if (a.verified() != b.verified()) {
                return a.verified() ? -1 : 1;
            }
            return Long.compare(b.listingsCount(), a.listingsCount());
        });
        return cards;
    }

    @Transactional(readOnly = true)
    public List<ReviewView> reviews(Long sellerId) {
        return reviewRepository.findTop20BySellerIdOrderByCreatedAtDesc(sellerId).stream().map(ReviewView::from).toList();
    }

    @Transactional
    public ReviewView review(Long authorId, Long sellerId, ReviewCreate body) {
        if (authorId.equals(sellerId)) {
            throw ApiException.badRequest("Vous ne pouvez pas vous noter vous-même.");
        }
        User seller = userRepository.findById(sellerId).orElseThrow(() -> ApiException.notFound("Vendeur introuvable"));
        User author = userRepository.findById(authorId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        Review r = reviewRepository.findBySellerIdAndAuthorId(sellerId, authorId).orElseGet(Review::new);
        r.setSeller(seller);
        r.setAuthor(author);
        r.setRating(body.rating());
        r.setComment(notBlank(body.comment()) ? body.comment().trim() : null);
        return ReviewView.from(reviewRepository.save(r));
    }

    @Transactional(readOnly = true)
    public List<SavedSearchView> savedSearches(Long userId) {
        return savedSearchRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public long totalNew(Long userId) {
        return savedSearchRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().mapToLong(this::newCount).sum();
    }

    @Transactional
    public SavedSearchView saveSearch(Long userId, SavedSearchCreate body) {
        if (!notBlank(body.q()) && body.category() == null && !notBlank(body.make()) && !notBlank(body.model())) {
            throw ApiException.badRequest("Précisez au moins une pièce, une catégorie ou une marque.");
        }
        if (savedSearchRepository.countByUserId(userId) >= MAX_SAVED_SEARCHES) {
            throw ApiException.badRequest("Maximum " + MAX_SAVED_SEARCHES + " alertes. Supprimez-en une d'abord.");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        SavedSearch s = new SavedSearch();
        s.setUser(user);
        s.setQ(trim(body.q()));
        s.setCategory(body.category());
        s.setMake(trim(body.make()));
        s.setModel(trim(body.model()));
        s.setYear(body.year());
        s.setCity(trim(body.city()));
        s.setLabel(label(s));
        return view(savedSearchRepository.save(s));
    }

    @Transactional
    public void markSeen(Long userId, Long id) {
        SavedSearch s = owned(userId, id);
        s.setLastSeenAt(Instant.now());
    }

    @Transactional
    public void deleteSearch(Long userId, Long id) {
        savedSearchRepository.delete(owned(userId, id));
    }

    private SavedSearch owned(Long userId, Long id) {
        SavedSearch s = savedSearchRepository.findById(id).orElseThrow(() -> ApiException.notFound("Alerte introuvable"));
        if (!s.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Ce n'est pas votre alerte.");
        }
        return s;
    }

    private SavedSearchView view(SavedSearch s) {
        return new SavedSearchView(s.getId(), s.getLabel(), s.getQ(), s.getCategory(), s.getMake(), s.getModel(),
                s.getYear(), s.getCity(), newCount(s), s.getCreatedAt());
    }

    private long newCount(SavedSearch s) {
        var filter = new ListingSpecifications.Filter(s.getQ(), s.getCategory(), null, s.getMake(), s.getModel(),
                s.getYear(), s.getCity(), null, null, null, null);
        Instant since = s.getLastSeenAt();
        Long ownerId = s.getUser().getId();
        Specification<Listing> spec = ListingSpecifications.search(filter)
                .and((root, query, cb) -> cb.greaterThan(root.get("createdAt"), since))
                .and((root, query, cb) -> cb.notEqual(root.get("seller").get("id"), ownerId));
        return listingRepository.count(spec);
    }

    private static String label(SavedSearch s) {
        List<String> parts = new ArrayList<>();
        if (s.getQ() != null) parts.add(s.getQ());
        if (s.getCategory() != null) parts.add(s.getCategory().label());
        if (s.getMake() != null) parts.add(s.getMake() + (s.getModel() != null ? " " + s.getModel() : ""));
        if (s.getYear() != null) parts.add(String.valueOf(s.getYear()));
        if (s.getCity() != null) parts.add(s.getCity());
        String label = String.join(" · ", parts);
        return label.length() > 120 ? label.substring(0, 120) : label;
    }

    private static Double round(Double v) {
        return v == null ? null : Math.round(v * 10) / 10.0;
    }

    private static String trim(String s) {
        return notBlank(s) ? s.trim() : null;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
