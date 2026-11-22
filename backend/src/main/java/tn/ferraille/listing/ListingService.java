package tn.ferraille.listing;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ferraille.common.ApiException;
import tn.ferraille.common.Money;
import tn.ferraille.common.PageResponse;
import tn.ferraille.listing.ListingDtos.FitDto;
import tn.ferraille.listing.ListingDtos.ListingDetail;
import tn.ferraille.listing.ListingDtos.ListingRequest;
import tn.ferraille.listing.ListingDtos.ListingSummary;
import tn.ferraille.user.User;
import tn.ferraille.user.UserRepository;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ListingSummary> search(ListingSpecifications.Filter filter, Pageable pageable) {
        Page<Listing> page = listingRepository.findAll(ListingSpecifications.search(filter), pageable);
        return PageResponse.of(page, ListingSummary::from);
    }

    @Transactional
    public ListingDetail get(Long id) {
        Listing listing = require(id);
        if (listing.getStatus() == ListingStatus.ARCHIVED) {
            throw ApiException.notFound("Annonce introuvable");
        }
        listingRepository.incrementViews(id);
        long count = listingRepository.countBySellerIdAndStatus(listing.getSeller().getId(), ListingStatus.ACTIVE);
        return ListingDetail.from(listing, count);
    }

    @Transactional(readOnly = true)
    public PageResponse<ListingSummary> mine(Long sellerId, Pageable pageable) {
        return PageResponse.of(
                listingRepository.findBySellerIdAndStatusNotOrderByCreatedAtDesc(sellerId, ListingStatus.ARCHIVED, pageable),
                ListingSummary::from);
    }

    @Transactional
    public ListingDetail create(Long sellerId, ListingRequest request) {
        User seller = userRepository.findById(sellerId).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        if (!seller.hasContact()) {
            throw ApiException.badRequest("Ajoute ton numéro WhatsApp ou de téléphone pour que les acheteurs puissent te contacter");
        }
        Listing listing = new Listing();
        listing.setSeller(seller);
        apply(listing, request);
        listingRepository.save(listing);
        return ListingDetail.from(listing, 0);
    }

    @Transactional
    public ListingDetail update(Long sellerId, Long id, ListingRequest request) {
        Listing listing = requireOwned(sellerId, id);
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw ApiException.conflict("Cette annonce ne peut plus être modifiée");
        }
        apply(listing, request);
        return ListingDetail.from(listing, 0);
    }

    @Transactional
    public void archive(Long sellerId, Long id) {
        Listing listing = requireOwned(sellerId, id);
        if (listing.getStatus() == ListingStatus.RESERVED) {
            throw ApiException.conflict("Une commande est en cours sur cette annonce");
        }
        listing.setStatus(ListingStatus.ARCHIVED);
    }

    @Transactional
    public void recordContact(Long id) {
        if (listingRepository.existsById(id)) {
            listingRepository.incrementContactClicks(id);
        }
    }

    public Listing require(Long id) {
        return listingRepository.findById(id).orElseThrow(() -> ApiException.notFound("Annonce introuvable"));
    }

    private Listing requireOwned(Long sellerId, Long id) {
        Listing listing = require(id);
        if (!listing.getSeller().getId().equals(sellerId)) {
            throw ApiException.forbidden("Cette annonce ne t'appartient pas");
        }
        return listing;
    }

    private void apply(Listing listing, ListingRequest r) {
        for (FitDto fit : r.fits()) {
            if (fit.yearFrom() != null && fit.yearTo() != null && fit.yearFrom() > fit.yearTo()) {
                throw ApiException.badRequest("Années de compatibilité invalides pour " + fit.make() + " " + fit.model());
            }
        }
        listing.setTitle(r.title().trim());
        listing.setDescription(r.description());
        listing.setCategory(r.category());
        listing.setCondition(r.condition());
        listing.setPrice(Money.of(r.price()));
        listing.setNegotiable(r.negotiable());
        listing.setCity(r.city().trim());
        listing.setOemReference(r.oemReference());
        listing.setPhotos(new ArrayList<>(r.photos()));
        listing.setFits(new ArrayList<>(r.fits().stream().map(FitDto::toEntity).toList()));
    }
}
