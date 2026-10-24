import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/api/models.dart';
import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';

/// Straight-line km from the kitchen to the customer's pin (null without a pin).
double? distanceKm(Delivery d) => d.lat == null || d.lng == null
    ? null
    : const Distance().as(
            LengthUnit.Meter,
            kitchenLatLng,
            LatLng(d.lat!, d.lng!),
          ) /
          1000;

/// Rough two-wheeler city estimate (~20 km/h) for [km].
int? etaMinutes(double? km) =>
    km == null ? null : (km / 20 * 60).ceil().clamp(1, 999);

/// Mockup 4: kitchen → customer on an OpenStreetMap card, straight-line distance, and a
/// Navigate button that hands turn-by-turn directions to Google Maps.
/// The dotted line is a straight line, not a road route (no routing service yet).
class RouteMapCard extends StatelessWidget {
  const RouteMapCard({
    super.key,
    required this.d,
    required this.toCustomer,
    this.mapHeight = 220,
  });

  final double mapHeight;
  final Delivery d;

  /// true once the order is picked up (heading to the customer); false = heading to the kitchen.
  final bool toCustomer;

  @override
  Widget build(BuildContext context) {
    final customer = d.lat != null && d.lng != null
        ? LatLng(d.lat!, d.lng!)
        : null;
    final km = customer == null
        ? null
        : const Distance().as(LengthUnit.Meter, kitchenLatLng, customer) / 1000;
    final points = [kitchenLatLng, ?customer];

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: A3Colors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: mapHeight,
            child: FlutterMap(
              options: MapOptions(
                initialCameraFit: customer == null
                    ? null
                    : CameraFit.coordinates(
                        coordinates: points,
                        padding: const EdgeInsets.all(48),
                      ),
                initialCenter: kitchenLatLng,
                initialZoom: 14,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.a3kitchen.delivery',
                ),
                if (customer != null)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: points,
                        strokeWidth: 4,
                        color: A3Colors.primary,
                        pattern: StrokePattern.dotted(),
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: kitchenLatLng,
                      width: 40,
                      height: 40,
                      child: const _Pin(
                        icon: Icons.restaurant_rounded,
                        color: A3Colors.primary,
                      ),
                    ),
                    if (customer != null)
                      Marker(
                        point: customer,
                        width: 40,
                        height: 40,
                        child: const _Pin(
                          icon: Icons.home_rounded,
                          color: A3Colors.danger,
                        ),
                      ),
                  ],
                ),
                const RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution('OpenStreetMap contributors'),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(A3Spacing.md),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        toCustomer ? 'Delivering to' : 'Pick up at',
                        style: const TextStyle(
                          fontSize: 12,
                          color: A3Colors.muted,
                        ),
                      ),
                      Text(
                        toCustomer ? d.recipient : kitchenName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        km != null
                            ? '${km.toStringAsFixed(1)} km away (straight line)'
                            : 'Customer didn’t drop a map pin; Navigate uses the address',
                        style: const TextStyle(
                          fontSize: 12,
                          color: A3Colors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: A3Spacing.sm),
                FilledButton.icon(
                  onPressed: () => toCustomer
                      ? navigateTo(
                          context,
                          d.addressLine,
                          lat: d.lat,
                          lng: d.lng,
                        )
                      : navigateTo(
                          context,
                          kitchenName,
                          lat: kitchenLatLng.latitude,
                          lng: kitchenLatLng.longitude,
                        ),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 46),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.navigation_rounded, size: 18),
                  label: const Text(
                    'Navigate',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.icon, required this.color});
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
      border: Border.all(color: Colors.white, width: 3),
      boxShadow: const [
        BoxShadow(
          color: Color(0x40000000),
          blurRadius: 6,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: Icon(icon, color: Colors.white, size: 18),
  );
}
