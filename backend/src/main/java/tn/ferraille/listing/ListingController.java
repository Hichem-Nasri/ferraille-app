package tn.ferraille.listing;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.ferraille.common.PageResponse;
import tn.ferraille.listing.ListingDtos.ListingDetail;
import tn.ferraille.listing.ListingDtos.ListingRequest;
import tn.ferraille.listing.ListingDtos.ListingSummary;
import tn.ferraille.security.AuthenticatedUser;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @GetMapping
    public PageResponse<ListingSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) PartCondition condition,
            @RequestParam(required = false) String make,
            @RequestParam(required = false) String model,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean proOnly,
            @RequestParam(required = false) Long sellerId,
            @RequestParam(defaultValue = "recent") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Sort order = switch (sort) {
            case "price_asc" -> Sort.by(Sort.Order.asc("price").nullsLast());
            case "price_desc" -> Sort.by(Sort.Order.desc("price").nullsLast());
            default -> Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("createdAt"));
        };
        var filter = new ListingSpecifications.Filter(q, category, condition, make, model, year, city, minPrice, maxPrice, proOnly, sellerId);
        return listingService.search(filter, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), order));
    }

    @GetMapping("/{id:\\d+}")
    public ListingDetail get(@PathVariable Long id) {
        return listingService.get(id);
    }

    @GetMapping("/mine")
    public PageResponse<ListingSummary> mine(@AuthenticationPrincipal AuthenticatedUser user,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return listingService.mine(user.id(), PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @PostMapping("/{id:\\d+}/contact")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void contact(@PathVariable Long id) {
        listingService.recordContact(id);
    }

    public record BulkRequest(@jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max = 10)
                              java.util.List<@Valid ListingRequest> listings) {
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public java.util.List<ListingDetail> bulk(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody BulkRequest request) {
        return listingService.createBulk(user.id(), request.listings());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ListingDetail create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody ListingRequest request) {
        return listingService.create(user.id(), request);
    }

    @PutMapping("/{id:\\d+}")
    public ListingDetail update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id,
                                @Valid @RequestBody ListingRequest request) {
        return listingService.update(user.id(), id, request);
    }

    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        listingService.archive(user.id(), id);
    }
}
