import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../auth/auth_controller.dart';
import '../orders/orders_providers.dart';

/// Add / edit a delivery address. Pops with the saved [Address].
class AddressFormScreen extends ConsumerStatefulWidget {
  const AddressFormScreen({super.key, this.existing});
  final Address? existing;

  @override
  ConsumerState<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends ConsumerState<AddressFormScreen> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(
    text:
        widget.existing?.recipientName ??
        ref.read(authProvider).value?.name ??
        '',
  );
  late final _phone = TextEditingController(
    text: (widget.existing?.phone ?? ref.read(authProvider).value?.phone ?? '')
        .replaceFirst('+91', ''),
  );
  late final _line1 = TextEditingController(text: widget.existing?.line1);
  late final _line2 = TextEditingController(text: widget.existing?.line2);
  late final _landmark = TextEditingController(text: widget.existing?.landmark);
  late final _city = TextEditingController(
    text: widget.existing?.city ?? 'Hyderabad',
  );
  late final _state = TextEditingController(
    text: widget.existing?.state ?? 'Telangana',
  );
  late final _pin = TextEditingController(text: widget.existing?.postalCode);
  late String _label = widget.existing?.label ?? 'HOME';
  late bool _default = widget.existing?.isDefault ?? false;
  bool _busy = false;
  String? _error;
  late double? _lat = widget.existing?.lat, _lng = widget.existing?.lng;
  String? _pinLabel;

  @override
  void initState() {
    super.initState();
    // New address: start on the map (Swiggy/Zomato flow), then fill the details.
    if (widget.existing == null) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _openMap(firstTime: true),
      );
    }
  }

  Future<void> _openMap({bool firstTime = false}) async {
    final place = await context.push<Place>(
      '/addresses/map',
      extra: _lat != null && _lng != null ? LatLng(_lat!, _lng!) : null,
    );
    if (place == null || !mounted) return;
    setState(() {
      _lat = place.lat;
      _lng = place.lng;
      _pinLabel = [
        place.title,
        place.subtitle,
      ].where((s) => s.isNotEmpty).join(', ');
      // Fill what the map knows; never overwrite the house/flat number the customer typed.
      if (_line2.text.trim().isEmpty || firstTime) {
        _line2.text = [
          place.line1,
          place.line2,
        ].whereType<String>().toSet().join(', ');
      }
      if (place.city != null) _city.text = place.city!;
      if (place.state != null) _state.text = place.state!;
      if (place.postalCode != null) _pin.text = place.postalCode!;
    });
  }

  @override
  void dispose() {
    for (final c in [
      _name,
      _phone,
      _line1,
      _line2,
      _landmark,
      _city,
      _state,
      _pin,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final body = {
      'label': _label,
      'recipientName': _name.text.trim(),
      'phone': _phone.text.trim(),
      'line1': _line1.text.trim(),
      if (_line2.text.trim().isNotEmpty) 'line2': _line2.text.trim(),
      if (_landmark.text.trim().isNotEmpty) 'landmark': _landmark.text.trim(),
      'city': _city.text.trim(),
      'state': _state.text.trim(),
      'postalCode': _pin.text.trim(),
      'isDefault': _default,
      if (_lat != null && _lng != null) 'lat': _lat,
      if (_lat != null && _lng != null) 'lng': _lng,
    };
    try {
      final api = ref.read(apiClientProvider);
      final data = widget.existing == null
          ? await api.post('/addresses', body)
          : await api.patch('/addresses/${widget.existing!.id}', body);
      ref.invalidate(addressesProvider);
      final saved = Address.fromJson(data as Map<String, dynamic>);
      if (!saved.isServiceable && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Saved — but we don’t deliver to ${saved.postalCode} yet.',
            ),
          ),
        );
      }
      if (mounted) context.pop(saved);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _required(String? v, String what) =>
      (v ?? '').trim().length < 2 ? 'Enter $what.' : null;

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: widget.existing == null ? 'Add address' : 'Edit address',
      child: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(A3Spacing.lg),
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'HOME',
                    label: Text('Home'),
                    icon: Icon(Icons.home_outlined),
                  ),
                  ButtonSegment(
                    value: 'WORK',
                    label: Text('Work'),
                    icon: Icon(Icons.work_outline),
                  ),
                  ButtonSegment(
                    value: 'OTHER',
                    label: Text('Other'),
                    icon: Icon(Icons.place_outlined),
                  ),
                ],
                selected: {_label},
                onSelectionChanged: (s) => setState(() => _label = s.first),
              ),
              const SizedBox(height: A3Spacing.lg),
              _MapCard(
                pinned: _lat != null,
                label:
                    _pinLabel ??
                    (_lat != null ? 'Location pinned on the map' : null),
                onTap: _openMap,
              ),
              const SizedBox(height: A3Spacing.lg),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Receiver’s name'),
                validator: (v) => _required(v, 'a name'),
              ),
              const SizedBox(height: A3Spacing.md),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile number',
                  prefixText: '+91 ',
                ),
                validator: (v) =>
                    RegExp(r'^[6-9]\d{9}$').hasMatch((v ?? '').trim())
                    ? null
                    : 'Enter a 10-digit mobile number.',
              ),
              const SizedBox(height: A3Spacing.md),
              TextFormField(
                controller: _line1,
                decoration: const InputDecoration(
                  labelText: 'Flat / house no., building',
                ),
                validator: (v) => _required(v, 'the house and building'),
              ),
              const SizedBox(height: A3Spacing.md),
              TextFormField(
                controller: _line2,
                decoration: const InputDecoration(
                  labelText: 'Street / area (optional)',
                ),
              ),
              const SizedBox(height: A3Spacing.md),
              TextFormField(
                controller: _landmark,
                decoration: const InputDecoration(
                  labelText: 'Landmark (optional)',
                ),
              ),
              const SizedBox(height: A3Spacing.md),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _city,
                      decoration: const InputDecoration(labelText: 'City'),
                      validator: (v) => _required(v, 'the city'),
                    ),
                  ),
                  const SizedBox(width: A3Spacing.md),
                  Expanded(
                    child: TextFormField(
                      controller: _pin,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: 'PIN code',
                        counterText: '',
                      ),
                      validator: (v) =>
                          RegExp(r'^[1-9]\d{5}$').hasMatch((v ?? '').trim())
                          ? null
                          : 'Enter a 6-digit PIN.',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: A3Spacing.md),
              TextFormField(
                controller: _state,
                decoration: const InputDecoration(labelText: 'State'),
                validator: (v) => _required(v, 'the state'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _default,
                onChanged: (v) => setState(() => _default = v),
                title: const Text('Make this my default address'),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: A3Spacing.sm),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: A3Colors.danger),
                  ),
                ),
              const SizedBox(height: A3Spacing.lg),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Save address'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Pin on map" row at the top of the form.
class _MapCard extends StatelessWidget {
  const _MapCard({
    required this.pinned,
    required this.label,
    required this.onTap,
  });
  final bool pinned;
  final String? label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: A3Colors.card,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(A3Spacing.md),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: pinned ? A3Colors.primarySoft : A3Colors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                pinned ? Icons.where_to_vote : Icons.map_outlined,
                color: A3Colors.primaryStrong,
              ),
            ),
            const SizedBox(width: A3Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pinned ? 'Pinned on map' : 'Set location on map',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    label ?? 'Helps the rider find your door',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: A3Colors.muted,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              pinned ? 'Change' : 'Open map',
              style: const TextStyle(
                color: A3Colors.primaryStrong,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
