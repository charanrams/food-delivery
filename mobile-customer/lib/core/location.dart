import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:location/location.dart' as loc;

/// If device location (GPS) is off, shows the system "Turn on device location"
/// dialog (Google Play Services on Android, settings prompt on iOS). Tapping OK
/// switches location on without leaving the app. Returns whether it's on.
Future<bool> ensureLocationServiceOn() async {
  if (await Geolocator.isLocationServiceEnabled()) return true;
  try {
    return await loc.Location().requestService();
  } catch (_) {
    return false;
  }
}

/// Runs once after sign-in: ask for the app's location permission if needed,
/// then ask the customer to switch device location on if it's off.
Future<void> ensureLocationAccess(BuildContext context) async {
  try {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always) {
      await ensureLocationServiceOn();
    }
  } catch (_) {
    // Graceful fallback to default delivery address
  }
}
