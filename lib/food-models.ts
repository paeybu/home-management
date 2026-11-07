import { longestKeywordMatch } from "@/lib/keyword-match";

/**
 * Food → 3D model mapping (Kenney Food Kit, CC0). Keys are file names (without .glb) in public/models/food/.
 * The longest keyword found in the item name wins (case-insensitive). This only gives the first guess for a new food;
 * the household's food_catalog row stores the final choice, which can be changed in the add/edit form.
 */
// A null model means "no good model for this food, use its emoji" (and beats shorter keyword matches).
const RULES: [string[], string | null][] = [
  [["chicken thigh", "drumstick", "น่อง", "สะโพก", "ปีกไก่"], "turkey"],
  [["fish fillet", "เนื้อปลา", "ปลากะพง", "ปลากระพง", "ปลาอินทรี"], "fish"],
  [["egg tofu", "tofu", "เต้าหู้ไข่", "เต้าหู้"], "cheese-cut"],
  [["squid", "octopus", "ปลาหมึก", "หมึก"], null],
  [["chili", "chilli", "พริก"], null],
  [["tom yum", "herb", "lemongrass", "ต้มยำ", "ตะไคร้", "ข่า", "ใบมะกรูด", "โหระพา", "กะเพรา"], null],
  [["ice cream", "ไอศกรีม", "ไอติม"], "ice-cream-cup"],
  [["popsicle", "ice pop", "ice lolly"], "popsicle"],
  [["eggplant", "aubergine", "มะเขือม่วง"], "eggplant"],
  [["egg", "ไข่"], "egg"],
  [["coconut", "มะพร้าว"], "coconut"],
  [["peanut butter"], "peanut-butter"],
  [["milk", "นม"], "carton"],
  [["yogurt", "yoghurt", "โยเกิร์ต"], "carton-small"],
  [["juice", "orange juice", "apple juice", "น้ำผลไม้", "น้ำส้ม"], "carton-small"],
  [["cheese", "ชีส"], "cheese"],
  [["butter", "เนย"], "cheese-cut"],
  [["pudding", "dessert", "พุดดิ้ง"], "pudding"],
  [["beer", "เบียร์"], "can"],
  [["red wine", "wine", "ไวน์"], "wine-red"],
  [["white wine"], "wine-white"],
  [["soda", "coke", "cola", "sprite", "โค้ก"], "soda-can"],
  [["water", "น้ำเปล่า"], "soda-bottle"],
  [["soy", "ซีอิ๊ว"], "soy"],
  [["mustard", "มัสตาร์ด"], "bottle-musterd"],
  [["oil", "น้ำมัน"], "bottle-oil"],
  [["ketchup", "sauce", "mayo", "ซอส", "น้ำปลา"], "bottle-ketchup"],
  [["honey", "jam", "น้ำผึ้ง", "แยม"], "honey"],
  [["chicken", "turkey", "ไก่"], "turkey"],
  [["bacon", "เบคอน"], "bacon-raw"],
  [["hot dog"], "hot-dog-raw"],
  [["sausage", "ไส้กรอก"], "sausage"],
  [["ham", "แฮม"], "whole-ham"],
  [["ribs", "ซี่โครง"], "meat-ribs"],
  [["mince", "ground", "patty", "หมูสับ"], "meat-patty"],
  [["pork", "beef", "steak", "meat", "หมู", "เนื้อ"], "meat-raw"],
  [["sushi", "ซูชิ"], "sushi-salmon"],
  [["maki"], "maki-salmon"],
  [["mussel", "หอยแมลงภู่"], "mussel"],
  [["fish", "salmon", "tuna", "ปลา"], "fish"],
  [["dumpling", "dim sum", "gyoza", "เกี๊ยว", "ขนมจีบ"], "dim-sum"],
  [["rice", "ข้าว"], "rice-ball"],
  [["baguette"], "loaf-baguette"],
  [["croissant", "ครัวซองต์"], "croissant"],
  [["bread", "ขนมปัง"], "loaf"],
  [["cupcake", "muffin"], "cupcake"],
  [["cake", "เค้ก"], "cake"],
  [["donut", "doughnut", "โดนัท"], "donut"],
  [["chocolate", "ช็อกโกแลต"], "chocolate"],
  [["cookie", "คุกกี้"], "cookie"],
  [["waffle"], "waffle"],
  [["pancake"], "pancakes"],
  [["pizza", "พิซซ่า"], "pizza"],
  [["sandwich", "แซนด์วิช"], "sandwich"],
  [["burger", "เบอร์เกอร์"], "burger"],
  [["taco"], "taco"],
  [["fries"], "fries"],
  [["salad", "สลัด"], "salad"],
  [["cabbage", "lettuce", "กะหล่ำ", "ผักกาด"], "cabbage"],
  [["cauliflower", "กะหล่ำดอก"], "cauliflower"],
  [["broccoli", "บรอกโคลี"], "broccoli"],
  [["carrot", "แครอท"], "carrot"],
  [["tomato", "มะเขือเทศ"], "tomato"],
  [["pepper", "capsicum", "paprika", "พริกหยวก"], "paprika"],
  [["corn", "ข้าวโพด"], "corn"],
  [["onion", "หอม"], "onion"],
  [["leek", "spring onion", "ต้นหอม"], "leek"],
  [["celery", "ขึ้นฉ่าย"], "celery-stick"],
  [["mushroom", "เห็ด"], "mushroom"],
  [["avocado", "อะโวคาโด"], "avocado"],
  [["lemon", "lime", "มะนาว"], "lemon"],
  [["pineapple", "สับปะรด"], "pineapple"],
  [["watermelon", "แตงโม"], "watermelon"],
  [["apple", "แอปเปิ้ล"], "apple"],
  [["banana", "กล้วย"], "banana"],
  [["orange", "ส้ม"], "orange"],
  [["grape", "องุ่น"], "grapes"],
  [["strawberr", "สตรอว์เบอร์รี"], "strawberry"],
  [["cherr", "เชอร์รี่"], "cherries"],
  [["pear", "สาลี่"], "pear"],
  [["pumpkin", "ฟักทอง"], "pumpkin"],
  [["radish", "หัวไชเท้า"], "radish"],
  [["beet"], "beet"],
];

/** Every model file available, for the "looks like" picker. */
export const FOOD_MODELS: string[] = [...new Set(RULES.map(([, m]) => m).filter((m): m is string => !!m))].sort();

export function foodModel(name: string): string | null {
  return longestKeywordMatch(name, RULES);
}

/** Stored model for a catalog entry → model key to render, or null for the emoji sprite. */
export function resolveModel(stored: string | null | undefined, name: string): string | null {
  if (stored === "none") return null;
  if (stored && FOOD_MODELS.includes(stored)) return stored;
  return foodModel(name);
}

export const modelUrl = (key: string) => `/models/food/${key}.glb`;

/** Human label for a model key: "bottle-ketchup" → "Bottle ketchup". */
export const modelLabel = (key: string) => (key.charAt(0).toUpperCase() + key.slice(1)).replace(/-/g, " ").replace("musterd", "mustard");
