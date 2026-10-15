import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// On-device preferences (not secrets — tokens live in secure storage).
final prefsProvider = FutureProvider<SharedPreferences>(
  (ref) => SharedPreferences.getInstance(),
);

const _onboardingKey = 'onboarding_seen_v1';
const _favoritesKey = 'favorite_product_ids_v1';

Future<bool> onboardingSeen() async =>
    (await SharedPreferences.getInstance()).getBool(_onboardingKey) ?? false;
Future<void> markOnboardingSeen() async =>
    (await SharedPreferences.getInstance()).setBool(_onboardingKey, true);

/// Favourite dishes, kept on this device (product ids).
class FavoritesController extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    final prefs = await ref.watch(prefsProvider.future);
    return (prefs.getStringList(_favoritesKey) ?? const []).toSet();
  }

  Future<void> toggle(String productId) async {
    final next = {...?state.value};
    next.contains(productId) ? next.remove(productId) : next.add(productId);
    state = AsyncData(next);
    final prefs = await ref.read(prefsProvider.future);
    await prefs.setStringList(_favoritesKey, next.toList());
  }

  Future<void> remove(String productId) async {
    final next = {...?state.value};
    if (next.remove(productId)) {
      state = AsyncData(next);
      final prefs = await ref.read(prefsProvider.future);
      await prefs.setStringList(_favoritesKey, next.toList());
    }
  }

  Future<void> clear() async {
    state = const AsyncData({});
    final prefs = await ref.read(prefsProvider.future);
    await prefs.remove(_favoritesKey);
  }
}

final favoritesProvider =
    AsyncNotifierProvider<FavoritesController, Set<String>>(
      FavoritesController.new,
    );
