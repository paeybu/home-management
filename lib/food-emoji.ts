import { longestKeywordMatch } from "@/lib/keyword-match";
import type { FridgeLocation, FridgeUnit } from "@/lib/types";

/**
 * Keyword → emoji. The longest keyword found in the item name wins (case-insensitive). Includes a few Thai words.
 */
const RULES: [string[], string][] = [
  [["chicken thigh", "drumstick", "น่อง", "สะโพก", "ปีกไก่"], "🍗"],
  [["ribs", "ซี่โครง"], "🍖"],
  [["fish fillet", "เนื้อปลา", "ปลากะพง", "ปลากระพง", "ปลาอินทรี"], "🐟"],
  [["tom yum", "herb", "lemongrass", "ต้มยำ", "ตะไคร้", "ข่า", "ใบมะกรูด", "โหระพา", "กะเพรา"], "🌿"],
  [["egg tofu", "เต้าหู้ไข่", "เต้าหู้"], "🧈"],
  [["ice cream", "ไอศกรีม", "ไอติม"], "🍨"],
  [["eggplant", "aubergine", "มะเขือม่วง"], "🍆"],
  [["egg", "ไข่"], "🥚"],
  [["coconut", "มะพร้าว"], "🥥"],
  [["peanut butter"], "🥜"],
  [["milk", "นม"], "🥛"],
  [["yogurt", "yoghurt", "โยเกิร์ต"], "🥣"],
  [["cheese", "ชีส"], "🧀"],
  [["butter", "เนย"], "🧈"],
  [["juice", "orange juice", "apple juice", "น้ำผลไม้", "น้ำส้ม"], "🧃"],
  [["beer", "เบียร์"], "🍺"],
  [["wine", "ไวน์"], "🍷"],
  [["soda", "coke", "cola", "sprite", "โค้ก"], "🥤"],
  [["water", "น้ำเปล่า"], "💧"],
  [["sauce", "ketchup", "mayo", "ซอส", "น้ำปลา"], "🫙"],
  [["jam", "honey", "แยม"], "🍯"],
  [["chicken", "ไก่"], "🍗"],
  [["bacon", "เบคอน"], "🥓"],
  [["sausage", "hot dog", "ไส้กรอก"], "🌭"],
  [["pork", "หมู"], "🥩"],
  [["beef", "steak", "เนื้อ"], "🥩"],
  [["meat", "mince"], "🥩"],
  [["shrimp", "prawn", "กุ้ง"], "🦐"],
  [["squid", "ปลาหมึก"], "🦑"],
  [["crab", "ปู"], "🦀"],
  [["fish", "salmon", "tuna", "ปลา"], "🐟"],
  [["dumpling", "gyoza", "เกี๊ยว"], "🥟"],
  [["tofu", "เต้าหู้"], "🧊"],
  [["rice", "ข้าว"], "🍚"],
  [["noodle", "เส้น", "บะหมี่"], "🍜"],
  [["bread", "ขนมปัง"], "🍞"],
  [["cake", "เค้ก"], "🍰"],
  [["chocolate", "ช็อกโกแลต"], "🍫"],
  [["pizza"], "🍕"],
  [["lettuce", "salad", "ผักสลัด", "ผักกาด"], "🥬"],
  [["cabbage", "กะหล่ำ"], "🥬"],
  [["broccoli", "บรอกโคลี"], "🥦"],
  [["carrot", "แครอท"], "🥕"],
  [["tomato", "มะเขือเทศ"], "🍅"],
  [["cucumber", "แตงกวา"], "🥒"],
  [["chili", "chilli", "พริก"], "🌶️"],
  [["pepper", "capsicum", "พริกหยวก"], "🫑"],
  [["corn", "ข้าวโพด"], "🌽"],
  [["potato", "มันฝรั่ง"], "🥔"],
  [["onion", "หอม"], "🧅"],
  [["garlic", "กระเทียม"], "🧄"],
  [["mushroom", "เห็ด"], "🍄"],
  [["avocado", "อะโวคาโด"], "🥑"],
  [["lime", "lemon", "มะนาว"], "🍋"],
  [["apple", "แอปเปิ้ล"], "🍎"],
  [["banana", "กล้วย"], "🍌"],
  [["orange", "ส้ม"], "🍊"],
  [["grape", "องุ่น"], "🍇"],
  [["strawberr", "สตรอว์เบอร์รี"], "🍓"],
  [["blueberr"], "🫐"],
  [["mango", "มะม่วง"], "🥭"],
  [["pineapple", "สับปะรด"], "🍍"],
  [["watermelon", "แตงโม"], "🍉"],
  [["melon"], "🍈"],
  [["peach"], "🍑"],
  [["cherr"], "🍒"],
  [["kiwi"], "🥝"],
  [["vegetable", "veg", "ผัก"], "🥗"],
  [["fruit", "ผลไม้"], "🍇"],
  [["ice", "น้ำแข็ง"], "🧊"],
];

/** Best-guess emoji for a grocery item, falling back on unit/location. */
export function foodEmoji(name: string, unit?: FridgeUnit, location?: FridgeLocation) {
  const hit = longestKeywordMatch(name, RULES);
  if (hit) return hit;
  if (unit === "ml" || unit === "l") return "🍶";
  if (location === "freezer") return "🧊";
  return "🥡";
}
