import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/location.dart';
import '../../core/theme/app_theme.dart';

/// Kitchen city — where the map opens when we don't know the customer's location yet.
const _kitchen = LatLng(17.385, 78.4867);

/// Map picker (Swiggy/Zomato style): the pin stays in the centre and the map moves under it.
/// Live search suggestions as you type, "use my location", and the address under the pin.
/// Pops with the chosen [Place].
class LocationPickerScreen extends ConsumerStatefulWidget {
  const LocationPickerScreen({super.key, this.initial});
  final LatLng? initial;

  @override
  ConsumerState<LocationPickerScreen> createState() =>
      _LocationPickerScreenState();
}

class _LocationPickerScreenState extends ConsumerState<LocationPickerScreen>
    with SingleTickerProviderStateMixin {
  final _map = MapController();
  final _search = TextEditingController();
  final _searchFocus = FocusNode();
  late final _lift = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
  );

  Timer? _searchDebounce, _reverseDebounce;
  int _searchSeq = 0, _reverseSeq = 0;
  List<Place> _suggestions = const [];
  bool _searching = false, _locating = false, _resolving = true;
  String? _searchError;
  Place? _place;

  @override
  void initState() {
    super.initState();
    _searchFocus.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initial != null) {
        _reverse(widget.initial!);
      } else {
        _reverse(_kitchen);
        _locateMe(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _reverseDebounce?.cancel();
    _search.dispose();
    _searchFocus.dispose();
    _lift.dispose();
    _map.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------- search (real time)
  void _onQuery(String q) {
    _searchDebounce?.cancel();
    if (q.trim().length < 2) {
      setState(() {
        _suggestions = const [];
        _searching = false;
        _searchError = null;
      });
      return;
    }
    setState(() => _searching = true);
    _searchDebounce = Timer(const Duration(milliseconds: 280), () async {
      final seq = ++_searchSeq;
      final c = _map.camera.center;
      try {
        final data =
            await ref
                    .read(apiClientProvider)
                    .get(
                      '/geo/search?q=${Uri.encodeQueryComponent(q.trim())}&lat=${c.latitude}&lng=${c.longitude}',
                    )
                as List;
        if (!mounted || seq != _searchSeq) return; // a newer keystroke won
        setState(() {
          _suggestions = [
            for (final j in data) Place.fromJson(j as Map<String, dynamic>),
          ];
          _searchError = _suggestions.isEmpty
              ? 'No places found. Try a nearby landmark or area.'
              : null;
        });
      } on ApiException catch (e) {
        if (mounted && seq == _searchSeq) {
          setState(() => _searchError = e.message);
        }
      } finally {
        if (mounted && seq == _searchSeq) setState(() => _searching = false);
      }
    });
  }

  void _pick(Place p) {
    _searchFocus.unfocus();
    setState(() {
      _suggestions = const [];
      _search.clear();
      _place = p;
      _resolving = false;
    });
    _map.move(LatLng(p.lat, p.lng), 17);
  }

  // ---------------------------------------------------------------- pin → address
  void _reverse(LatLng at) {
    _reverseDebounce?.cancel();
    setState(() => _resolving = true);
    _reverseDebounce = Timer(const Duration(milliseconds: 450), () async {
      final seq = ++_reverseSeq;
      try {
        final data = await ref
            .read(apiClientProvider)
            .get('/geo/reverse?lat=${at.latitude}&lng=${at.longitude}');
        if (!mounted || seq != _reverseSeq) return;
        setState(() => _place = Place.fromJson(data as Map<String, dynamic>));
      } on ApiException {
        if (!mounted || seq != _reverseSeq) return;
        setState(
          () => _place = Place(
            id: 'pin',
            title: 'Pinned location',
            subtitle: 'Add the address details on the next step',
            lat: at.latitude,
            lng: at.longitude,
          ),
        );
      } finally {
        if (mounted && seq == _reverseSeq) setState(() => _resolving = false);
      }
    });
  }

  Future<void> _locateMe({bool silent = false}) async {
    setState(() => _locating = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        if (!silent) {
          _toast(
            'Allow location access to use your current location.',
            action: Geolocator.openAppSettings,
          );
        }
        return;
      }
      // Shows the system "Turn on device location" popup when GPS is off.
      if (!await ensureLocationServiceOn()) {
        if (!silent) {
          _toast(
            'Your location is off. Turn it on to use your current location.',
            action: Geolocator.openLocationSettings,
          );
        }
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (!mounted) return;
      final here = LatLng(pos.latitude, pos.longitude);
      _map.move(here, 17);
      _reverse(here);
    } catch (_) {
      if (!silent) {
        _toast('Couldn’t get your location. Search or move the map instead.');
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _toast(String msg, {Future<bool> Function()? action}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Text(msg),
          action: action == null
              ? null
              : SnackBarAction(label: 'Settings', onPressed: () => action()),
        ),
      );
  }

  // ---------------------------------------------------------------- UI
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    final showList =
        _searchFocus.hasFocus &&
        (_suggestions.isNotEmpty || _searchError != null || _searching);
    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          Positioned.fill(
            child: FlutterMap(
              mapController: _map,
              options: MapOptions(
                initialCenter: widget.initial ?? _kitchen,
                initialZoom: widget.initial != null ? 17 : 13,
                minZoom: 5,
                maxZoom: 19,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
                onMapEvent: (e) {
                  if (e is MapEventMoveStart &&
                      e.source != MapEventSource.mapController) {
                    _lift.forward();
                    _searchFocus.unfocus();
                  } else if (e is MapEventMoveEnd ||
                      (e is MapEventMove &&
                          e.source == MapEventSource.mapController)) {
                    _lift.reverse();
                    if (e is MapEventMoveEnd &&
                        e.source != MapEventSource.mapController) {
                      _reverse(e.camera.center);
                    }
                  }
                },
              ),
              children: [
                // OpenStreetMap standard tiles: reliable, free, and keyless.
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'in.a3kitchen.customer',
                  maxZoom: 19,
                ),
                const RichAttributionWidget(
                  alignment: AttributionAlignment.bottomLeft,
                  attributions: [
                    TextSourceAttribution('© OpenStreetMap contributors'),
                  ],
                ),
              ],
            ),
          ),

          // Centre pin — lifts while the map is dragged, drops when it settles.
          IgnorePointer(
            child: Center(
              child: AnimatedBuilder(
                animation: _lift,
                builder: (_, _) {
                  final t = Curves.easeOut.transform(_lift.value);
                  return Transform.translate(
                    offset: Offset(0, -24 - 12 * t),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.location_on,
                          size: 52,
                          color: A3Colors.primaryStrong,
                          shadows: [
                            Shadow(
                              color: Color(0x4029231F),
                              blurRadius: 8,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        Container(
                          width: 10 - 4 * t,
                          height: 4 - t,
                          decoration: BoxDecoration(
                            color: A3Colors.ink.withValues(
                              alpha: 0.25 - 0.1 * t,
                            ),
                            borderRadius: BorderRadius.circular(9),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),

          // Search bar + live suggestions.
          Positioned(
            left: A3Spacing.lg,
            right: A3Spacing.lg,
            top: top + A3Spacing.md,
            child: Column(
              children: [
                Material(
                  elevation: 3,
                  shadowColor: const Color(0x3329231F),
                  borderRadius: BorderRadius.circular(16),
                  color: A3Colors.surface,
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: 'Back',
                        icon: const Icon(Icons.arrow_back),
                        onPressed: () => context.pop(),
                      ),
                      Expanded(
                        child: TextField(
                          controller: _search,
                          focusNode: _searchFocus,
                          onChanged: _onQuery,
                          textInputAction: TextInputAction.search,
                          decoration: const InputDecoration(
                            hintText: 'Search area, street, landmark…',
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            isDense: true,
                          ),
                        ),
                      ),
                      if (_searching)
                        const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      else if (_search.text.isNotEmpty)
                        IconButton(
                          tooltip: 'Clear',
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            _search.clear();
                            _onQuery('');
                          },
                        ),
                    ],
                  ),
                ),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: !showList
                      ? const SizedBox.shrink()
                      : Container(
                          key: const ValueKey('list'),
                          margin: const EdgeInsets.only(top: A3Spacing.sm),
                          constraints: BoxConstraints(
                            maxHeight: MediaQuery.sizeOf(context).height * 0.5,
                          ),
                          decoration: BoxDecoration(
                            color: A3Colors.surface,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x2629231F),
                                blurRadius: 16,
                                offset: Offset(0, 6),
                              ),
                            ],
                          ),
                          child: _searchError != null && _suggestions.isEmpty
                              ? Padding(
                                  padding: const EdgeInsets.all(A3Spacing.lg),
                                  child: Text(
                                    _searchError!,
                                    style: const TextStyle(
                                      color: A3Colors.muted,
                                    ),
                                  ),
                                )
                              : ListView.separated(
                                  shrinkWrap: true,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: A3Spacing.sm,
                                  ),
                                  itemCount: _suggestions.length,
                                  separatorBuilder: (_, _) => const Divider(
                                    height: 1,
                                    indent: 56,
                                    color: A3Colors.line,
                                  ),
                                  itemBuilder: (_, i) {
                                    final p = _suggestions[i];
                                    return ListTile(
                                      leading: const CircleAvatar(
                                        radius: 18,
                                        backgroundColor: A3Colors.primarySoft,
                                        child: Icon(
                                          Icons.place_outlined,
                                          size: 20,
                                          color: A3Colors.primaryStrong,
                                        ),
                                      ),
                                      title: _Highlighted(
                                        text: p.title,
                                        query: _search.text,
                                      ),
                                      subtitle: p.subtitle.isEmpty
                                          ? null
                                          : Text(
                                              p.subtitle,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 12.5,
                                                color: A3Colors.muted,
                                              ),
                                            ),
                                      onTap: () => _pick(p),
                                    );
                                  },
                                ),
                        ),
                ),
              ],
            ),
          ),

          // Bottom: locate me + address under the pin + confirm.
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Padding(
                  padding: const EdgeInsets.only(
                    right: A3Spacing.lg,
                    bottom: A3Spacing.md,
                  ),
                  child: Material(
                    color: A3Colors.surface,
                    elevation: 3,
                    shape: const StadiumBorder(),
                    child: InkWell(
                      customBorder: const StadiumBorder(),
                      onTap: _locating ? null : () => _locateMe(),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _locating
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.my_location,
                                    size: 20,
                                    color: A3Colors.primaryStrong,
                                  ),
                            const SizedBox(width: 8),
                            const Text(
                              'Use my location',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: A3Colors.primaryStrong,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: A3Colors.surface,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(28),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x2629231F),
                        blurRadius: 20,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  padding: EdgeInsets.fromLTRB(
                    A3Spacing.xl,
                    A3Spacing.xl,
                    A3Spacing.xl,
                    MediaQuery.paddingOf(context).bottom + A3Spacing.lg,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Deliver to this spot',
                        style: TextStyle(
                          fontSize: 13,
                          color: A3Colors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: _resolving || _place == null
                            ? const _AddressSkeleton(key: ValueKey('sk'))
                            : Row(
                                key: ValueKey(_place!.id),
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.only(top: 2),
                                    child: Icon(
                                      Icons.location_on,
                                      color: A3Colors.primaryStrong,
                                    ),
                                  ),
                                  const SizedBox(width: A3Spacing.sm),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _place!.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        if (_place!.subtitle.isNotEmpty)
                                          Text(
                                            _place!.subtitle,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: A3Colors.muted,
                                              height: 1.4,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                      ),
                      const SizedBox(height: A3Spacing.lg),
                      FilledButton(
                        onPressed: _resolving || _place == null
                            ? null
                            : () => context.pop(_place),
                        child: const Text('Confirm location'),
                      ),
                    ],
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

/// Bolds the part of a suggestion that matches what was typed.
class _Highlighted extends StatelessWidget {
  const _Highlighted({required this.text, required this.query});
  final String text, query;
  @override
  Widget build(BuildContext context) {
    const base = TextStyle(
      fontSize: 15,
      color: A3Colors.ink,
      fontWeight: FontWeight.w500,
    );
    final q = query.trim().toLowerCase();
    final i = q.isEmpty ? -1 : text.toLowerCase().indexOf(q);
    if (i < 0) {
      return Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: base,
      );
    }
    return Text.rich(
      TextSpan(
        style: base,
        children: [
          TextSpan(text: text.substring(0, i)),
          TextSpan(
            text: text.substring(i, i + q.length),
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          TextSpan(text: text.substring(i + q.length)),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

class _AddressSkeleton extends StatelessWidget {
  const _AddressSkeleton({super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Finding the address',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 18,
          width: 180,
          decoration: BoxDecoration(
            color: A3Colors.card,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: 14,
          width: 260,
          decoration: BoxDecoration(
            color: A3Colors.card,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
      ],
    ),
  );
}
