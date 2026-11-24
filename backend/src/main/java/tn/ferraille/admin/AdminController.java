package tn.ferraille.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.order.OrderDtos.OrderDetail;
import tn.ferraille.order.OrderDtos.OrderSummary;
import tn.ferraille.order.OrderDtos.ResolveDisputeRequest;
import tn.ferraille.order.OrderDtos.StatusUpdateRequest;
import tn.ferraille.order.OrderService;
import tn.ferraille.order.OrderStatus;
import tn.ferraille.wallet.WalletService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final WalletService walletService;
    private final tn.ferraille.user.UserRepository userRepository;
    private final tn.ferraille.listing.ListingRepository listingRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final tn.ferraille.listing.ListingService listingService;

    public record AdminSeller(Long id, String name, String sellerType, boolean verified, String city, boolean demo,
                              long activeListings, long soldListings, long soldViaFerraille, long views,
                              long contactClicks, java.time.Instant lastListingAt) {
    }

    public record ManagedSellerRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 120) String fullName,
                                       @jakarta.validation.constraints.Size(max = 120) String shopName,
                                       @jakarta.validation.constraints.NotNull tn.ferraille.user.SellerType sellerType,
                                       @jakarta.validation.constraints.Size(max = 30) String whatsapp,
                                       @jakarta.validation.constraints.Size(max = 30) String phone,
                                       @jakarta.validation.constraints.Size(max = 80) String city,
                                       @jakarta.validation.constraints.Size(max = 200) String address,
                                       boolean consent) {
    }

    @PostMapping("/sellers")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> createManagedSeller(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody ManagedSellerRequest r) {
        if (!r.consent()) {
            throw tn.ferraille.common.ApiException.badRequest("Le vendeur doit avoir donné son accord pour qu'on publie à sa place.");
        }
        if (isBlank(r.whatsapp()) && isBlank(r.phone())) {
            throw tn.ferraille.common.ApiException.badRequest("Un numéro WhatsApp ou de téléphone est obligatoire.");
        }
        if (r.sellerType() == tn.ferraille.user.SellerType.PRO && isBlank(r.shopName())) {
            throw tn.ferraille.common.ApiException.badRequest("Le nom de la casse est obligatoire pour un pro.");
        }
        var u = new tn.ferraille.user.User();
        u.setFullName(r.fullName().trim());
        u.setShopName(isBlank(r.shopName()) ? null : r.shopName().trim());
        u.setSellerType(r.sellerType());
        u.setWhatsapp(isBlank(r.whatsapp()) ? null : r.whatsapp().replaceAll("[^0-9+]", ""));
        u.setPhone(isBlank(r.phone()) ? null : r.phone().replaceAll("[^0-9+]", ""));
        u.setCity(isBlank(r.city()) ? null : r.city().trim());
        u.setAddress(isBlank(r.address()) ? null : r.address().trim());
        userRepository.save(u);
        return java.util.Map.of("id", u.getId(), "name", u.getDisplayName());
    }

    @PostMapping("/users/{id}/listings/bulk")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public java.util.List<tn.ferraille.listing.ListingDtos.ListingDetail> publishFor(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody tn.ferraille.listing.ListingController.BulkRequest request) {
        return listingService.createBulk(id, request.listings());
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    @org.springframework.web.bind.annotation.GetMapping("/sellers")
    public java.util.List<AdminSeller> sellers() {
        return jdbc.query("""
                select u.id,
                       case when u.seller_type = 'PRO' and coalesce(u.shop_name, '') <> '' then u.shop_name else u.full_name end as name,
                       u.seller_type, u.verified, u.city,
                       coalesce(u.email, '') like '%@demo.ferraille.tn' as demo,
                       count(l.id) filter (where l.status = 'ACTIVE') as active,
                       count(l.id) filter (where l.status = 'SOLD') as sold,
                       count(l.id) filter (where l.sold_via_ferraille) as via,
                       coalesce(sum(l.views), 0) as views,
                       coalesce(sum(l.contact_clicks), 0) as contacts,
                       max(l.created_at) as last_listing
                from users u join listings l on l.seller_id = u.id
                group by u.id
                order by demo, contacts desc, active desc
                """, (rs, i) -> new AdminSeller(rs.getLong("id"), rs.getString("name"), rs.getString("seller_type"),
                rs.getBoolean("verified"), rs.getString("city"), rs.getBoolean("demo"), rs.getLong("active"),
                rs.getLong("sold"), rs.getLong("via"), rs.getLong("views"), rs.getLong("contacts"),
                rs.getTimestamp("last_listing") == null ? null : rs.getTimestamp("last_listing").toInstant()));
    }

    public record AdminUser(Long id, String fullName, String email, String phone, String whatsapp, String facebookUrl,
                            String city, String sellerType, String shopName, String role, boolean facebook,
                            long activeListings, boolean verified, java.time.Instant createdAt) {
    }

    @PostMapping("/users/{id}/verified")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> toggleVerified(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var u = userRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Utilisateur introuvable"));
        u.setVerified(!u.isVerified());
        return java.util.Map.of("verified", u.isVerified());
    }

    @PostMapping("/listings/{id}/featured")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> toggleFeatured(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var l = listingRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Annonce introuvable"));
        l.setFeatured(!l.isFeatured());
        return java.util.Map.of("featured", l.isFeatured());
    }

    @PostMapping("/listings/{id}/archive")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Boolean> archive(@org.springframework.web.bind.annotation.PathVariable Long id) {
        var l = listingRepository.findById(id).orElseThrow(() -> tn.ferraille.common.ApiException.notFound("Annonce introuvable"));
        l.setStatus(tn.ferraille.listing.ListingStatus.ARCHIVED);
        l.setFeatured(false);
        return java.util.Map.of("archived", true);
    }

    @GetMapping("/users")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<AdminUser> users() {
        return userRepository.findAll(org.springframework.data.domain.Sort.by("createdAt").descending()).stream()
                .map(u -> new AdminUser(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getWhatsapp(),
                        u.getFacebookUrl(), u.getCity(), u.getSellerType().name(), u.getShopName(), u.getRole().name(),
                        u.getFacebookId() != null,
                        listingRepository.countBySellerIdAndStatus(u.getId(), tn.ferraille.listing.ListingStatus.ACTIVE),
                        u.isVerified(), u.getCreatedAt()))
                .toList();
    }

    @GetMapping("/orders")
    public PageResponse<OrderSummary> orders(@RequestParam OrderStatus status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return orderService.byStatus(status, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/orders/{id}/delivery-status")
    public OrderDetail deliveryStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return orderService.updateDeliveryStatus(id, request.status(), request.location());
    }

    @PostMapping("/orders/{id}/resolve")
    public OrderDetail resolve(@PathVariable Long id, @RequestBody ResolveDisputeRequest request) {
        return orderService.resolveDispute(id, request.refundBuyer());
    }

    @GetMapping("/payouts")
    public PageResponse<WalletService.TransactionDto> payouts(@RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return walletService.pendingPayouts(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @PostMapping("/payouts/{id}/paid")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void payoutPaid(@PathVariable Long id) {
        walletService.markPayoutPaid(id);
    }
}
