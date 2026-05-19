import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import "../App.css";

const API_BASE = "https://stock-radar-api-os48.onrender.com";

// ─── 市場股票池（用於強勢掃描、K線雷達、隔日沖選股）────────────────────────
// 格式：{ symbol, name, industry }
// 掃描時只取前 N 筆避免太慢，可依需求調整 slice 數量
const MARKET_STRONG_POOL = [{"symbol": "1101", "name": "台泥", "industry": "水泥"}, {"symbol": "1102", "name": "亞泥", "industry": "水泥"}, {"symbol": "1216", "name": "統一", "industry": "食品"}, {"symbol": "1301", "name": "台塑", "industry": "石化"}, {"symbol": "1303", "name": "南亞", "industry": "石化"}, {"symbol": "1326", "name": "台化", "industry": "石化"}, {"symbol": "1402", "name": "遠東新", "industry": "紡織"}, {"symbol": "1476", "name": "儒鴻", "industry": "紡織"}, {"symbol": "1504", "name": "東元", "industry": "重電"}, {"symbol": "1519", "name": "華城", "industry": "重電"}, {"symbol": "1590", "name": "亞德客-KY", "industry": "重電"}, {"symbol": "1605", "name": "華新", "industry": "重電"}, {"symbol": "2002", "name": "中鋼", "industry": "鋼鐵"}, {"symbol": "2049", "name": "上銀", "industry": "鋼鐵"}, {"symbol": "2207", "name": "和泰車", "industry": "汽車"}, {"symbol": "2301", "name": "光寶科", "industry": "光電"}, {"symbol": "2303", "name": "聯電", "industry": "晶圓代工"}, {"symbol": "2308", "name": "台達電", "industry": "電子零組件"}, {"symbol": "2317", "name": "鴻海", "industry": "EMS"}, {"symbol": "2324", "name": "仁寶", "industry": "EMS"}, {"symbol": "2327", "name": "國巨*", "industry": "被動元件"}, {"symbol": "2330", "name": "台積電", "industry": "晶圓代工"}, {"symbol": "2344", "name": "華邦電", "industry": "記憶體"}, {"symbol": "2345", "name": "智邦", "industry": "網通"}, {"symbol": "2352", "name": "佳世達", "industry": "半導體/電子"}, {"symbol": "2353", "name": "宏碁", "industry": "半導體/電子"}, {"symbol": "2354", "name": "鴻準", "industry": "機殼"}, {"symbol": "2356", "name": "英業達", "industry": "EMS"}, {"symbol": "2357", "name": "華碩", "industry": "半導體/電子"}, {"symbol": "2376", "name": "技嘉", "industry": "半導體/電子"}, {"symbol": "2377", "name": "微星", "industry": "半導體/電子"}, {"symbol": "2379", "name": "瑞昱", "industry": "IC設計"}, {"symbol": "2382", "name": "廣達", "industry": "伺服器"}, {"symbol": "2383", "name": "台光電", "industry": "PCB"}, {"symbol": "2395", "name": "研華", "industry": "半導體/電子"}, {"symbol": "2408", "name": "南亞科", "industry": "記憶體"}, {"symbol": "2409", "name": "友達", "industry": "面板"}, {"symbol": "2412", "name": "中華電", "industry": "電信"}, {"symbol": "2454", "name": "聯發科", "industry": "IC設計"}, {"symbol": "2474", "name": "可成", "industry": "機殼"}, {"symbol": "2603", "name": "長榮", "industry": "航運"}, {"symbol": "2609", "name": "陽明", "industry": "航運"}, {"symbol": "2615", "name": "萬海", "industry": "航運"}, {"symbol": "2801", "name": "彰銀", "industry": "金融"}, {"symbol": "2880", "name": "華南金", "industry": "金融"}, {"symbol": "2881", "name": "富邦金", "industry": "金融"}, {"symbol": "2882", "name": "國泰金", "industry": "金融"}, {"symbol": "2883", "name": "凱基金", "industry": "金融"}, {"symbol": "2884", "name": "玉山金", "industry": "金融"}, {"symbol": "2885", "name": "元大金", "industry": "金融"}, {"symbol": "2886", "name": "兆豐金", "industry": "金融"}, {"symbol": "2887", "name": "台新新光金", "industry": "金融"}, {"symbol": "2890", "name": "永豐金", "industry": "金融"}, {"symbol": "2891", "name": "中信金", "industry": "金融"}, {"symbol": "2892", "name": "第一金", "industry": "金融"}, {"symbol": "2912", "name": "統一超", "industry": "零售"}, {"symbol": "3008", "name": "大立光", "industry": "電子"}, {"symbol": "3017", "name": "奇鋐", "industry": "散熱"}, {"symbol": "3034", "name": "聯詠", "industry": "IC設計"}, {"symbol": "3035", "name": "智原", "industry": "IC設計"}, {"symbol": "3036", "name": "文曄", "industry": "電子"}, {"symbol": "3037", "name": "欣興", "industry": "PCB"}, {"symbol": "3045", "name": "台灣大", "industry": "電信"}, {"symbol": "3231", "name": "緯創", "industry": "EMS"}, {"symbol": "3234", "name": "光環科技", "industry": "光纖/網通"}, {"symbol": "3311", "name": "閎暉", "industry": "電子"}, {"symbol": "3443", "name": "創意", "industry": "IC設計"}, {"symbol": "3481", "name": "群創", "industry": "面板"}, {"symbol": "3529", "name": "力旺電子", "industry": "電子"}, {"symbol": "3653", "name": "健策", "industry": "散熱"}, {"symbol": "3661", "name": "世芯-KY", "industry": "IC設計"}, {"symbol": "3711", "name": "日月光投控", "industry": "IC封測"}, {"symbol": "4904", "name": "遠傳", "industry": "電信"}, {"symbol": "4938", "name": "和碩", "industry": "EMS"}, {"symbol": "5269", "name": "祥碩", "industry": "IC設計"}, {"symbol": "5274", "name": "信驊科技", "industry": "IC設計"}, {"symbol": "5871", "name": "中租-KY", "industry": "租賃"}, {"symbol": "5880", "name": "合庫金", "industry": "金融"}, {"symbol": "6415", "name": "矽力*-KY", "industry": "IC設計"}, {"symbol": "6446", "name": "藥華藥", "industry": "生技"}, {"symbol": "6669", "name": "緯穎", "industry": "伺服器"}, {"symbol": "6670", "name": "復盛應用", "industry": "電子"}, {"symbol": "8046", "name": "南電", "industry": "PCB"}, {"symbol": "8454", "name": "富邦媒", "industry": "零售"}, {"symbol": "9910", "name": "豐泰", "industry": "其他"}, {"symbol": "9945", "name": "潤泰新", "industry": "其他"}, {"symbol": "3105", "name": "穩懋半導體", "industry": "IC封測"}, {"symbol": "3152", "name": "璟德電子工業", "industry": "IC封測"}, {"symbol": "3217", "name": "優群科技", "industry": "電子"}, {"symbol": "3227", "name": "原相科技", "industry": "IC設計"}, {"symbol": "3264", "name": "欣銓科技", "industry": "IC封測"}, {"symbol": "3324", "name": "雙鴻科技", "industry": "散熱"}, {"symbol": "3374", "name": "精材科技", "industry": "IC封測"}, {"symbol": "3563", "name": "牧德", "industry": "電子"}, {"symbol": "3680", "name": "家登精密工業", "industry": "電子"}, {"symbol": "4123", "name": "晟德大藥廠", "industry": "生技"}, {"symbol": "4743", "name": "合一生技", "industry": "生技"}, {"symbol": "4966", "name": "譜瑞科技", "industry": "IC設計"}, {"symbol": "5009", "name": "榮剛材料科技", "industry": "其他"}, {"symbol": "5347", "name": "世界先進積體電路", "industry": "晶圓代工"}, {"symbol": "5371", "name": "中強光電", "industry": "其他"}, {"symbol": "5425", "name": "台灣半導體", "industry": "面板"}, {"symbol": "5483", "name": "中美矽晶製品", "industry": "記憶體"}, {"symbol": "6121", "name": "新普科技", "industry": "IC封測"}, {"symbol": "6147", "name": "頎邦科技", "industry": "IC封測"}, {"symbol": "6182", "name": "合晶科技", "industry": "半導體材料"}, {"symbol": "6187", "name": "萬潤科技", "industry": "電子"}, {"symbol": "6231", "name": "系微", "industry": "電子"}, {"symbol": "6274", "name": "台燿科技", "industry": "PCB"}, {"symbol": "6488", "name": "環球晶圓", "industry": "晶圓代工"}, {"symbol": "6547", "name": "高端疫苗生物製劑", "industry": "生技"}, {"symbol": "8069", "name": "元太科技工業", "industry": "電子"}, {"symbol": "8299", "name": "群聯電子", "industry": "記憶體"}, {"symbol": "1240", "name": "茂生農經", "industry": "食品"}, {"symbol": "1259", "name": "安心食品服務", "industry": "食品"}, {"symbol": "1264", "name": "德麥食品", "industry": "食品"}, {"symbol": "1268", "name": "漢來美食", "industry": "食品"}, {"symbol": "1294", "name": "漢田生技", "industry": "生技"}, {"symbol": "1295", "name": "生合生物科技", "industry": "食品"}, {"symbol": "1336", "name": "台翰精密科技", "industry": "石化"}, {"symbol": "1565", "name": "精華光學", "industry": "重電"}, {"symbol": "1569", "name": "濱川企業", "industry": "重電"}, {"symbol": "1570", "name": "力肯實業", "industry": "重電"}, {"symbol": "1580", "name": "新麥企業", "industry": "重電"}, {"symbol": "1584", "name": "精剛精密科技", "industry": "重電"}, {"symbol": "1586", "name": "和勤精機", "industry": "重電"}, {"symbol": "1591", "name": "英屬開曼群島商駿吉控股(股)公司", "industry": "重電"}, {"symbol": "1593", "name": "祺驊", "industry": "重電"}, {"symbol": "1595", "name": "川寶科技", "industry": "重電"}, {"symbol": "1599", "name": "宏佳騰動力科技", "industry": "重電"}, {"symbol": "1742", "name": "台灣蠟品", "industry": "食品"}, {"symbol": "1777", "name": "生泰合成工業", "industry": "醫療"}, {"symbol": "1781", "name": "合世生醫科技", "industry": "食品"}, {"symbol": "1784", "name": "訊聯生物科技", "industry": "食品"}, {"symbol": "1785", "name": "光洋應用材料科技", "industry": "食品"}, {"symbol": "1788", "name": "杏昌生技", "industry": "生技"}, {"symbol": "1796", "name": "金穎生物科技", "industry": "生技"}, {"symbol": "1799", "name": "易威生醫科技", "industry": "食品"}, {"symbol": "1813", "name": "寶利徠光學科技", "industry": "其他製造"}, {"symbol": "1815", "name": "富喬工業", "industry": "其他製造"}, {"symbol": "2035", "name": "唐榮鐵工廠", "industry": "鋼鐵"}, {"symbol": "2061", "name": "風青實業", "industry": "鋼鐵"}, {"symbol": "2063", "name": "世鎧精密", "industry": "鋼鐵"}, {"symbol": "2064", "name": "晉椿工業", "industry": "鋼鐵"}, {"symbol": "2065", "name": "世豐螺絲", "industry": "紡織"}, {"symbol": "2066", "name": "世德工業", "industry": "鋼鐵"}, {"symbol": "2067", "name": "嘉鋼精密工業", "industry": "鋼鐵"}, {"symbol": "2070", "name": "精湛光學科技", "industry": "鋼鐵"}, {"symbol": "2073", "name": "雄順金屬", "industry": "鋼鐵"}, {"symbol": "2221", "name": "大甲永和機械工業", "industry": "電子"}, {"symbol": "2230", "name": "泰茂實業", "industry": "電子"}, {"symbol": "2235", "name": "謚源實業", "industry": "電子"}, {"symbol": "2596", "name": "綠意開發", "industry": "營建"}, {"symbol": "2640", "name": "台灣大車隊", "industry": "航運"}, {"symbol": "2641", "name": "正德海運", "industry": "航運"}, {"symbol": "2643", "name": "捷迅", "industry": "航運"}, {"symbol": "2718", "name": "全心投資控股", "industry": "飯店/觀光"}, {"symbol": "2719", "name": "台鋼燦星國際旅行社", "industry": "鋼鐵"}, {"symbol": "2724", "name": "藝舍國際創新", "industry": "飯店/觀光"}, {"symbol": "2726", "name": "雅茗天地", "industry": "飯店/觀光"}, {"symbol": "2729", "name": "瓦城泰統", "industry": "飯店/觀光"}, {"symbol": "2732", "name": "六角國際事業", "industry": "飯店/觀光"}, {"symbol": "2734", "name": "易飛網國際旅行社", "industry": "飯店/觀光"}, {"symbol": "2736", "name": "富野大飯店", "industry": "飯店/觀光"}, {"symbol": "2740", "name": "華軒地產", "industry": "飯店/觀光"}, {"symbol": "2743", "name": "山富國際旅行社", "industry": "飯店/觀光"}, {"symbol": "2745", "name": "五福旅行社", "industry": "飯店/觀光"}, {"symbol": "2751", "name": "王座國際餐飲", "industry": "餐飲"}, {"symbol": "2752", "name": "豆府", "industry": "飯店/觀光"}, {"symbol": "2754", "name": "亞洲藏壽司", "industry": "飯店/觀光"}, {"symbol": "2755", "name": "揚秦國際企業", "industry": "飯店/觀光"}, {"symbol": "2756", "name": "聯發國際餐飲事業", "industry": "餐飲"}, {"symbol": "2916", "name": "滿心企業", "industry": "零售"}, {"symbol": "2924", "name": "開曼群島宏太", "industry": "零售"}, {"symbol": "2926", "name": "誠品生活", "industry": "零售"}, {"symbol": "2937", "name": "集雅社", "industry": "零售"}, {"symbol": "2941", "name": "米斯特國際企業", "industry": "零售"}, {"symbol": "2947", "name": "振宇五金", "industry": "零售"}, {"symbol": "2948", "name": "寶陞國際", "industry": "零售"}, {"symbol": "2949", "name": "欣新網", "industry": "零售"}, {"symbol": "3064", "name": "泰偉電子", "industry": "電子"}, {"symbol": "3066", "name": "李洲科技", "industry": "電子"}, {"symbol": "3067", "name": "全域", "industry": "電子"}, {"symbol": "3071", "name": "協禧電機", "industry": "電子"}, {"symbol": "3073", "name": "天方能源科技", "industry": "電子"}, {"symbol": "3078", "name": "僑威科技", "industry": "電子"}, {"symbol": "3081", "name": "聯亞光電工業", "industry": "電子"}, {"symbol": "3083", "name": "中華網龍", "industry": "電子"}, {"symbol": "3085", "name": "台鋼新零售", "industry": "鋼鐵"}, {"symbol": "3086", "name": "華義國際數位娛樂", "industry": "電子"}, {"symbol": "3088", "name": "艾訊", "industry": "電子"}, {"symbol": "3093", "name": "台灣港建", "industry": "電子"}, {"symbol": "3095", "name": "及成企業", "industry": "電子"}, {"symbol": "3114", "name": "好德科技", "industry": "電子"}, {"symbol": "3115", "name": "富育榮綱", "industry": "電子"}, {"symbol": "3118", "name": "進階生物科技", "industry": "電子"}, {"symbol": "3122", "name": "笙泉科技", "industry": "電子"}, {"symbol": "3128", "name": "昇銳智慧科技", "industry": "電子"}, {"symbol": "3131", "name": "弘塑科技", "industry": "電子"}, {"symbol": "3141", "name": "晶宏半導體", "industry": "電子"}, {"symbol": "3147", "name": "大綜電腦系統", "industry": "電子"}, {"symbol": "3158", "name": "嘉實資訊", "industry": "電子"}, {"symbol": "3162", "name": "精確實業", "industry": "電子"}, {"symbol": "3163", "name": "波若威科技", "industry": "PCB"}, {"symbol": "3169", "name": "亞信電子", "industry": "電子"}, {"symbol": "3171", "name": "炎洲流通", "industry": "電子"}, {"symbol": "3176", "name": "基亞生物科技", "industry": "電子"}, {"symbol": "3178", "name": "公準精密工業", "industry": "電子"}, {"symbol": "3188", "name": "鑫龍騰開發", "industry": "電子"}, {"symbol": "3191", "name": "雲嘉南科技", "industry": "電子"}, {"symbol": "3205", "name": "佰研生化科技", "industry": "電子"}, {"symbol": "3206", "name": "志豐電子", "industry": "電子"}, {"symbol": "3207", "name": "耀勝電子", "industry": "電子"}, {"symbol": "3211", "name": "順達科技", "industry": "電子"}, {"symbol": "3213", "name": "茂訊電腦", "industry": "電子"}, {"symbol": "3218", "name": "大學光學科技", "industry": "電子"}, {"symbol": "3219", "name": "倚強科技", "industry": "電子"}, {"symbol": "3221", "name": "台灣嘉碩科技", "industry": "電子"}, {"symbol": "3224", "name": "三顧", "industry": "電子"}, {"symbol": "3226", "name": "龍鋒科技", "industry": "電子"}, {"symbol": "3228", "name": "金麗科技", "industry": "電子"}, {"symbol": "3230", "name": "錦明實業", "industry": "電子"}, {"symbol": "3232", "name": "昱捷", "industry": "電子"}, {"symbol": "3236", "name": "千如電機工業", "industry": "電子"}, {"symbol": "3252", "name": "海灣國際開發(股)公司", "industry": "電子"}, {"symbol": "3259", "name": "鑫創科技", "industry": "電子"}, {"symbol": "3260", "name": "威剛科技", "industry": "記憶體"}, {"symbol": "3265", "name": "台星科", "industry": "電子"}, {"symbol": "3268", "name": "海德威電子工業", "industry": "電子"}, {"symbol": "3272", "name": "東碩資訊", "industry": "電子"}, {"symbol": "3276", "name": "宇環科技", "industry": "電子"}, {"symbol": "3284", "name": "太普高精密影像", "industry": "電子"}, {"symbol": "3285", "name": "微端科技", "industry": "電子"}, {"symbol": "3287", "name": "廣寰科技", "industry": "電子"}, {"symbol": "3288", "name": "點晶科技", "industry": "電子"}, {"symbol": "3289", "name": "宜特科技", "industry": "電子"}, {"symbol": "3290", "name": "東浦精密光電", "industry": "電子"}, {"symbol": "3293", "name": "鈊象電子", "industry": "電子"}, {"symbol": "3294", "name": "英濟", "industry": "電子"}, {"symbol": "3297", "name": "杭特電子", "industry": "電子"}, {"symbol": "3303", "name": "岱稜科技", "industry": "電子"}, {"symbol": "3306", "name": "鼎天國際", "industry": "電子"}, {"symbol": "3310", "name": "佳穎精密企業", "industry": "電子"}, {"symbol": "3313", "name": "斐成開發科技", "industry": "電子"}, {"symbol": "3317", "name": "尼克森微電子", "industry": "電源管理"}, {"symbol": "3322", "name": "建舜電子製造", "industry": "電子"}, {"symbol": "3323", "name": "加百裕工業", "industry": "電子"}, {"symbol": "3325", "name": "旭品科技", "industry": "電子"}, {"symbol": "3332", "name": "幸康電子", "industry": "電子"}, {"symbol": "3339", "name": "泰谷光電科技", "industry": "電子"}, {"symbol": "3349", "name": "寶德科技", "industry": "電子"}, {"symbol": "3354", "name": "律勝科技", "industry": "電子"}, {"symbol": "3357", "name": "西北臺慶科技", "industry": "電子"}, {"symbol": "3360", "name": "尚立", "industry": "電子"}, {"symbol": "3362", "name": "先進光電科技", "industry": "電子"}, {"symbol": "3363", "name": "上詮光纖通信", "industry": "光纖/網通"}, {"symbol": "3372", "name": "台灣典範半導體", "industry": "電子"}, {"symbol": "3373", "name": "熱映光電", "industry": "電子"}, {"symbol": "3379", "name": "彬台科技", "industry": "電子"}, {"symbol": "3388", "name": "崇越電通", "industry": "電子"}, {"symbol": "3390", "name": "旭軟電子科技", "industry": "電子"}, {"symbol": "3402", "name": "漢科系統科技", "industry": "電子"}, {"symbol": "3426", "name": "台興電子企業", "industry": "電子"}, {"symbol": "3430", "name": "奇鈦科技", "industry": "電子"}, {"symbol": "3434", "name": "哲固資訊科技", "industry": "電子"}, {"symbol": "3438", "name": "台灣類比科技", "industry": "電子"}, {"symbol": "3441", "name": "聯一光電", "industry": "電子"}, {"symbol": "3444", "name": "利機企業", "industry": "電子"}, {"symbol": "3455", "name": "由田新技", "industry": "電子"}, {"symbol": "3465", "name": "進泰電子科技", "industry": "電子"}, {"symbol": "3466", "name": "德晉科技", "industry": "電子"}, {"symbol": "3467", "name": "台灣精材", "industry": "電子"}, {"symbol": "3479", "name": "安勤科技", "industry": "電子"}, {"symbol": "3483", "name": "力致科技", "industry": "電子"}, {"symbol": "3484", "name": "崧騰企業", "industry": "電子"}, {"symbol": "3485", "name": "敘(余+卜+又)豐企業", "industry": "電子"}, {"symbol": "3489", "name": "森寶開發", "industry": "電子"}, {"symbol": "3490", "name": "單井工業", "industry": "電子"}, {"symbol": "3491", "name": "昇達科技", "industry": "電子"}, {"symbol": "3492", "name": "長盛科技", "industry": "電子"}, {"symbol": "3498", "name": "陽程科技", "industry": "電子"}, {"symbol": "3499", "name": "環天世通科技", "industry": "電子"}, {"symbol": "3508", "name": "位速科技", "industry": "電子"}, {"symbol": "3511", "name": "矽瑪科技", "industry": "電子"}, {"symbol": "3512", "name": "皇龍開發", "industry": "電子"}, {"symbol": "3516", "name": "亞帝歐光電", "industry": "電子"}, {"symbol": "3520", "name": "華盈電子", "industry": "電子"}, {"symbol": "3521", "name": "台鋼建設事業", "industry": "鋼鐵"}, {"symbol": "3522", "name": "御嵿國際", "industry": "電子"}, {"symbol": "3523", "name": "迎輝科技", "industry": "電子"}, {"symbol": "3526", "name": "凡甲科技", "industry": "光纖/網通"}, {"symbol": "3527", "name": "聚積科技", "industry": "電子"}, {"symbol": "3531", "name": "先益電子工業", "industry": "電子"}, {"symbol": "3537", "name": "堡達實業", "industry": "電子"}, {"symbol": "3540", "name": "曜越科技", "industry": "電子"}, {"symbol": "3541", "name": "西柏科技", "industry": "電子"}, {"symbol": "3546", "name": "宇峻奧汀科技", "industry": "電子"}, {"symbol": "3548", "name": "兆利科技工業", "industry": "電子"}, {"symbol": "3551", "name": "世禾科技", "industry": "電子"}, {"symbol": "3552", "name": "同致電子企業", "industry": "電子"}, {"symbol": "3555", "name": "博士旺創新", "industry": "電子"}, {"symbol": "3556", "name": "禾瑞亞科技", "industry": "電子"}, {"symbol": "3558", "name": "神準科技", "industry": "電子"}, {"symbol": "3564", "name": "其陽科技", "industry": "電子"}, {"symbol": "3567", "name": "逸昌科技", "industry": "電子"}, {"symbol": "3570", "name": "大塚資訊科技", "industry": "電子"}, {"symbol": "3577", "name": "泓格科技", "industry": "電子"}, {"symbol": "3580", "name": "友威科技", "industry": "電子"}, {"symbol": "3581", "name": "博磊科技", "industry": "電子"}, {"symbol": "3587", "name": "閎康科技", "industry": "電子"}, {"symbol": "3594", "name": "磐儀科技", "industry": "電子"}, {"symbol": "3597", "name": "映興電子", "industry": "電子"}, {"symbol": "3609", "name": "三一東林科技", "industry": "電子"}, {"symbol": "3611", "name": "鼎翰科技", "industry": "電子"}, {"symbol": "3615", "name": "安可光電", "industry": "電子"}, {"symbol": "3623", "name": "富晶通科技", "industry": "電子"}, {"symbol": "3624", "name": "光頡科技", "industry": "電子"}, {"symbol": "3625", "name": "西勝國際", "industry": "電子"}, {"symbol": "3628", "name": "盈正豫順電子", "industry": "電子"}, {"symbol": "3629", "name": "地心引力", "industry": "電子"}, {"symbol": "3630", "name": "新鉅科技", "industry": "電子"}, {"symbol": "3631", "name": "晟楠科技", "industry": "電子"}, {"symbol": "3632", "name": "研勤科技", "industry": "電子"}, {"symbol": "3646", "name": "艾恩特精密工業", "industry": "電子"}, {"symbol": "3663", "name": "鑫科材料科技", "industry": "電子"}, {"symbol": "3664", "name": "安瑞科技", "industry": "電子"}, {"symbol": "3666", "name": "光耀科技", "industry": "電子"}, {"symbol": "3672", "name": "康聯訊科技", "industry": "電子"}, {"symbol": "3675", "name": "德微科技", "industry": "電子"}, {"symbol": "3684", "name": "榮昌科技", "industry": "電子"}, {"symbol": "3685", "name": "元創精密車業", "industry": "電子"}, {"symbol": "3687", "name": "茂為歐買尬數位科技", "industry": "電子"}, {"symbol": "3689", "name": "湧德電子", "industry": "電子"}, {"symbol": "3691", "name": "碩禾電子材料", "industry": "電子"}, {"symbol": "3693", "name": "營邦企業", "industry": "電子"}, {"symbol": "3707", "name": "漢磊科技", "industry": "電子"}, {"symbol": "3709", "name": "鑫聯大投資控股", "industry": "電子"}, {"symbol": "3710", "name": "連展投資控股", "industry": "電子"}, {"symbol": "3713", "name": "新晶投資控股", "industry": "電子"}, {"symbol": "4102", "name": "永日化學工業", "industry": "生技"}, {"symbol": "4105", "name": "台灣東洋藥品工業", "industry": "醫療"}, {"symbol": "4107", "name": "邦特生物科技", "industry": "生技"}, {"symbol": "4109", "name": "加捷生醫", "industry": "生技"}, {"symbol": "4111", "name": "濟生醫藥生技", "industry": "生技"}, {"symbol": "4113", "name": "聯上實業", "industry": "生技"}, {"symbol": "4114", "name": "健喬信元醫藥生技", "industry": "生技"}, {"symbol": "4116", "name": "明基三豐醫療器材", "industry": "生技"}, {"symbol": "4120", "name": "友華生技醫藥", "industry": "生技"}, {"symbol": "4121", "name": "優盛醫學科技", "industry": "生技"}, {"symbol": "4126", "name": "太平洋醫材", "industry": "生技"}, {"symbol": "4127", "name": "天良生物科技企業", "industry": "生技"}, {"symbol": "4128", "name": "中天生物科技", "industry": "生技"}, {"symbol": "4129", "name": "聯合骨科器材", "industry": "生技"}, {"symbol": "4130", "name": "健亞生物科技", "industry": "生技"}, {"symbol": "4131", "name": "浩泰精準", "industry": "生技"}, {"symbol": "4138", "name": "曜亞國際", "industry": "生技"}, {"symbol": "4139", "name": "馬光保健控股", "industry": "生技"}, {"symbol": "4147", "name": "中裕新藥", "industry": "生技"}, {"symbol": "4153", "name": "鈺緯科技開發", "industry": "生技"}, {"symbol": "4154", "name": "樂威科", "industry": "生技"}, {"symbol": "4157", "name": "太景醫藥研發控股", "industry": "生技"}, {"symbol": "4160", "name": "訊聯基因數位", "industry": "生技"}, {"symbol": "4161", "name": "聿新生物科技", "industry": "生技"}, {"symbol": "4162", "name": "智擎生技製藥", "industry": "生技"}, {"symbol": "4163", "name": "鐿鈦科技", "industry": "生技"}, {"symbol": "4166", "name": "友霖生技醫藥", "industry": "生技"}, {"symbol": "4167", "name": "松瑞製藥", "industry": "生技"}, {"symbol": "4168", "name": "台灣醣聯生技醫藥", "industry": "生技"}, {"symbol": "4171", "name": "瑞基海洋生物科技", "industry": "生技"}, {"symbol": "4173", "name": "久裕企業", "industry": "生技"}, {"symbol": "4174", "name": "台灣浩鼎生技", "industry": "生技"}, {"symbol": "4175", "name": "杏一醫療用品", "industry": "生技"}, {"symbol": "4183", "name": "福永生物科技", "industry": "生技"}, {"symbol": "4188", "name": "安克生醫", "industry": "生技"}, {"symbol": "4192", "name": "杏國新藥", "industry": "生技"}, {"symbol": "4198", "name": "欣大健康投資控股", "industry": "生技"}, {"symbol": "4205", "name": "中華食品實業", "industry": "光纖/網通"}, {"symbol": "4207", "name": "環泰企業", "industry": "其他"}, {"symbol": "4303", "name": "信立化學工業", "industry": "其他"}, {"symbol": "4304", "name": "勝昱科技", "industry": "其他"}, {"symbol": "4305", "name": "世坤塑膠", "industry": "石化"}, {"symbol": "4401", "name": "東隆興業", "industry": "其他"}, {"symbol": "4402", "name": "郡都開發", "industry": "其他"}, {"symbol": "4406", "name": "新昕纖維", "industry": "紡織"}, {"symbol": "4413", "name": "飛寶企業", "industry": "其他"}, {"symbol": "4416", "name": "三圓建設", "industry": "營建"}, {"symbol": "4417", "name": "金洲海洋科技", "industry": "其他"}, {"symbol": "4419", "name": "皇家國際美食", "industry": "其他"}, {"symbol": "4420", "name": "光明絲織廠", "industry": "紡織"}, {"symbol": "4430", "name": "耀億工業", "industry": "其他"}, {"symbol": "4432", "name": "銘旺實業", "industry": "其他"}, {"symbol": "4433", "name": "興采實業", "industry": "其他"}, {"symbol": "4442", "name": "開曼群島商竣邦國際", "industry": "其他"}, {"symbol": "4502", "name": "健信科技工業", "industry": "其他"}, {"symbol": "4503", "name": "金雨企業", "industry": "其他"}, {"symbol": "4506", "name": "崇友實業(股)公司", "industry": "其他"}, {"symbol": "4510", "name": "高鋒工業", "industry": "其他"}, {"symbol": "4513", "name": "福裕事業", "industry": "其他"}, {"symbol": "4523", "name": "永彰科技", "industry": "其他"}, {"symbol": "4527", "name": "(方方土)霖冷凍機械", "industry": "其他"}, {"symbol": "4528", "name": "江興鍛壓工業", "industry": "其他"}, {"symbol": "4529", "name": "淳紳", "industry": "其他"}, {"symbol": "4530", "name": "宏易創新國際", "industry": "其他"}, {"symbol": "4533", "name": "協易機械工業", "industry": "其他"}, {"symbol": "4534", "name": "慶騰精密科技", "industry": "其他"}, {"symbol": "4535", "name": "至興精機", "industry": "其他"}, {"symbol": "4538", "name": "大詠城機械", "industry": "其他"}, {"symbol": "4541", "name": "晟田科技工業", "industry": "其他"}, {"symbol": "4542", "name": "科嶠工業", "industry": "其他"}, {"symbol": "4543", "name": "萬在工業", "industry": "其他"}, {"symbol": "4549", "name": "桓達科技", "industry": "其他"}, {"symbol": "4550", "name": "長佳機電工程", "industry": "其他"}, {"symbol": "4554", "name": "橙的電子", "industry": "其他"}, {"symbol": "4556", "name": "旭然國際", "industry": "其他"}, {"symbol": "4558", "name": "寶緯工業", "industry": "其他"}, {"symbol": "4561", "name": "健椿工業", "industry": "其他"}, {"symbol": "4563", "name": "百德機械", "industry": "其他"}, {"symbol": "4568", "name": "科際精密", "industry": "其他"}, {"symbol": "4577", "name": "達航科技", "industry": "其他"}, {"symbol": "4580", "name": "捷流閥業", "industry": "其他"}, {"symbol": "4584", "name": "君帆工業", "industry": "其他"}, {"symbol": "4609", "name": "唐鋒實業", "industry": "其他"}, {"symbol": "4702", "name": "中美聯合實業", "industry": "其他"}, {"symbol": "4706", "name": "大恭化學工業", "industry": "其他"}, {"symbol": "4707", "name": "磐亞", "industry": "其他"}, {"symbol": "4711", "name": "永純化學工業", "industry": "其他"}, {"symbol": "4714", "name": "永捷創新科技", "industry": "其他"}, {"symbol": "4716", "name": "大立高分子工業", "industry": "其他"}, {"symbol": "4721", "name": "美琪瑪國際", "industry": "其他"}, {"symbol": "4726", "name": "永昕生物醫藥", "industry": "生技"}, {"symbol": "4728", "name": "雙美生物科技", "industry": "其他"}, {"symbol": "4729", "name": "熒茂光學", "industry": "其他"}, {"symbol": "4735", "name": "豪展醫療科技", "industry": "生技"}, {"symbol": "4741", "name": "泓瀚科技", "industry": "其他"}, {"symbol": "4744", "name": "皇將科技", "industry": "其他"}, {"symbol": "4745", "name": "合富醫療控股", "industry": "生技"}, {"symbol": "4747", "name": "強生化學製藥廠", "industry": "生技"}, {"symbol": "4749", "name": "新應材", "industry": "其他"}, {"symbol": "4754", "name": "國碳科技", "industry": "其他"}, {"symbol": "4760", "name": "勤凱科技", "industry": "其他"}, {"symbol": "4767", "name": "誠泰工業科技", "industry": "其他"}, {"symbol": "4768", "name": "晶呈科技", "industry": "其他"}, {"symbol": "4772", "name": "台灣特品化學", "industry": "其他"}, {"symbol": "4804", "name": "大略國際控股", "industry": "其他"}, {"symbol": "4806", "name": "桂田文創娛樂", "industry": "其他"}, {"symbol": "4903", "name": "聯合光纖通信", "industry": "光纖/網通"}, {"symbol": "4905", "name": "台聯電訊", "industry": "電信"}, {"symbol": "4907", "name": "富宇地產", "industry": "電信"}, {"symbol": "4908", "name": "前鼎光電", "industry": "電信"}, {"symbol": "4909", "name": "新復興微波通訊", "industry": "電信"}, {"symbol": "4911", "name": "德英生物科技", "industry": "電信"}, {"symbol": "4923", "name": "力士科技", "industry": "電源管理"}, {"symbol": "4924", "name": "欣厚科技", "industry": "電信"}, {"symbol": "4931", "name": "新盛力科技", "industry": "電信"}, {"symbol": "4933", "name": "友輝光電", "industry": "電信"}, {"symbol": "4939", "name": "亞洲電材", "industry": "電信"}, {"symbol": "4946", "name": "紅心辣椒娛樂科技", "industry": "電信"}, {"symbol": "4950", "name": "金耘國際", "industry": "電信"}, {"symbol": "4951", "name": "精拓科技", "industry": "電信"}, {"symbol": "4953", "name": "緯創軟體", "industry": "電信"}, {"symbol": "4971", "name": "英特磊科技", "industry": "電信"}, {"symbol": "4972", "name": "湯石照明科技", "industry": "電信"}, {"symbol": "4973", "name": "廣穎電通", "industry": "電信"}, {"symbol": "4974", "name": "亞泰影像科技", "industry": "電信"}, {"symbol": "4979", "name": "華星光通科技", "industry": "電信"}, {"symbol": "4987", "name": "科誠", "industry": "電信"}, {"symbol": "4991", "name": "環宇通訊半導體控股", "industry": "電信"}, {"symbol": "4995", "name": "晶達光電", "industry": "電信"}, {"symbol": "5011", "name": "久陽精密", "industry": "其他"}, {"symbol": "5013", "name": "強新工業", "industry": "其他"}, {"symbol": "5014", "name": "建錩實業", "industry": "其他"}, {"symbol": "5015", "name": "華祺工業", "industry": "其他"}, {"symbol": "5016", "name": "松和工業", "industry": "其他"}, {"symbol": "5201", "name": "凱衛資訊", "industry": "軟體"}, {"symbol": "5202", "name": "力新國際科技", "industry": "軟體"}, {"symbol": "5205", "name": "中茂能資系統整合科技(股)公司", "industry": "軟體"}, {"symbol": "5206", "name": "坤悅開發", "industry": "軟體"}, {"symbol": "5209", "name": "新鼎系統", "industry": "軟體"}, {"symbol": "5210", "name": "寶碩財務科技", "industry": "軟體"}, {"symbol": "5211", "name": "蒙恬科技", "industry": "軟體"}, {"symbol": "5212", "name": "凌網科技", "industry": "軟體"}, {"symbol": "5213", "name": "亞昕國際開發", "industry": "軟體"}, {"symbol": "5220", "name": "萬達光電科技", "industry": "軟體"}, {"symbol": "5223", "name": "安力國際", "industry": "軟體"}, {"symbol": "5227", "name": "蓋曼群島商立凱電能科技(股)公司", "industry": "軟體"}, {"symbol": "5228", "name": "鈺鎧科技", "industry": "軟體"}, {"symbol": "5230", "name": "雷笛克光學", "industry": "軟體"}, {"symbol": "5236", "name": "凌陽創新科技", "industry": "軟體"}, {"symbol": "5245", "name": "智晶光電", "industry": "軟體"}, {"symbol": "5251", "name": "天鉞電子", "industry": "軟體"}, {"symbol": "5263", "name": "智崴資訊科技", "industry": "軟體"}, {"symbol": "5272", "name": "笙科電子", "industry": "軟體"}, {"symbol": "5276", "name": "達輝", "industry": "軟體"}, {"symbol": "5278", "name": "尚凡國際創新科技", "industry": "軟體"}, {"symbol": "5287", "name": "數字科技", "industry": "軟體"}, {"symbol": "5289", "name": "宜鼎國際", "industry": "軟體"}, {"symbol": "5291", "name": "邑昇實業", "industry": "軟體"}, {"symbol": "5299", "name": "杰力科技", "industry": "電源管理"}, {"symbol": "5301", "name": "寶得利國際", "industry": "其他"}, {"symbol": "5302", "name": "太欣半導體", "industry": "其他"}, {"symbol": "5309", "name": "系統電子工業", "industry": "其他"}, {"symbol": "5310", "name": "天剛資訊", "industry": "其他"}, {"symbol": "5312", "name": "寶島光學科技", "industry": "其他"}, {"symbol": "5314", "name": "世紀民生科技", "industry": "其他"}, {"symbol": "5315", "name": "光聯科技", "industry": "其他"}, {"symbol": "5321", "name": "美而快國際", "industry": "其他"}, {"symbol": "5324", "name": "士林開發", "industry": "其他"}, {"symbol": "5328", "name": "華容", "industry": "其他"}, {"symbol": "5340", "name": "建榮工業材料", "industry": "其他"}, {"symbol": "5344", "name": "立衛科技", "industry": "其他"}, {"symbol": "5345", "name": "馥鴻建設", "industry": "營建"}, {"symbol": "5348", "name": "正能量智能", "industry": "其他"}, {"symbol": "5351", "name": "鈺創科技", "industry": "其他"}, {"symbol": "5353", "name": "台林電通", "industry": "其他"}, {"symbol": "5355", "name": "佳總興業", "industry": "其他"}, {"symbol": "5356", "name": "協益電子", "industry": "其他"}, {"symbol": "5364", "name": "力麗觀光開發", "industry": "飯店/觀光"}, {"symbol": "5381", "name": "光譜電工", "industry": "其他"}, {"symbol": "5386", "name": "青雲國際科技", "industry": "其他"}, {"symbol": "5392", "name": "能率創新", "industry": "其他"}, {"symbol": "5398", "name": "慕康生技醫藥", "industry": "生技"}, {"symbol": "5403", "name": "中菲電腦", "industry": "其他"}, {"symbol": "5410", "name": "國眾電腦", "industry": "其他"}, {"symbol": "5426", "name": "振發實業", "industry": "其他"}, {"symbol": "5432", "name": "新門科技", "industry": "其他"}, {"symbol": "5438", "name": "東友科技", "industry": "其他"}, {"symbol": "5439", "name": "高技企業", "industry": "其他"}, {"symbol": "5443", "name": "均豪精密工業", "industry": "其他"}, {"symbol": "5450", "name": "南良國際", "industry": "其他"}, {"symbol": "5452", "name": "佶優科技", "industry": "其他"}, {"symbol": "5455", "name": "昇益開發", "industry": "其他"}, {"symbol": "5457", "name": "宣德科技", "industry": "其他"}, {"symbol": "5460", "name": "同協電子", "industry": "其他"}, {"symbol": "5464", "name": "霖宏科技", "industry": "其他"}, {"symbol": "5465", "name": "富驊企業", "industry": "其他"}, {"symbol": "5468", "name": "凱鈺科技", "industry": "其他"}, {"symbol": "5474", "name": "聰泰科技開發", "industry": "其他"}, {"symbol": "5475", "name": "德宏工業", "industry": "其他"}, {"symbol": "5478", "name": "智冠科技", "industry": "其他"}, {"symbol": "5481", "name": "新華泰富", "industry": "其他"}, {"symbol": "5487", "name": "通泰積體電路", "industry": "其他"}, {"symbol": "5488", "name": "松普科技", "industry": "其他"}, {"symbol": "5489", "name": "彩富電子", "industry": "其他"}, {"symbol": "5490", "name": "同亨科技", "industry": "其他"}, {"symbol": "5493", "name": "三聯科技", "industry": "其他"}, {"symbol": "5498", "name": "凱崴電子", "industry": "其他"}, {"symbol": "5508", "name": "永信建設開發", "industry": "營建"}, {"symbol": "5511", "name": "德昌營造", "industry": "其他"}, {"symbol": "5512", "name": "力麒建設", "industry": "營建"}, {"symbol": "5514", "name": "三豐建設", "industry": "營建"}, {"symbol": "5516", "name": "雙喜營造", "industry": "其他"}, {"symbol": "5520", "name": "力泰建設企業", "industry": "營建"}, {"symbol": "5523", "name": "豐謙建設", "industry": "營建"}, {"symbol": "5529", "name": "鉅陞國際開發", "industry": "其他"}, {"symbol": "5530", "name": "龍巖", "industry": "其他"}, {"symbol": "5536", "name": "聖暉工程科技", "industry": "其他"}, {"symbol": "5543", "name": "桓鼎", "industry": "其他"}, {"symbol": "5547", "name": "久舜營造", "industry": "其他"}, {"symbol": "5548", "name": "安倉營造", "industry": "其他"}, {"symbol": "5601", "name": "臺聯貨櫃通運", "industry": "其他"}, {"symbol": "5603", "name": "陸海", "industry": "其他"}, {"symbol": "5604", "name": "中連誠企業", "industry": "其他"}, {"symbol": "5609", "name": "中菲行國際物流", "industry": "航運"}, {"symbol": "5701", "name": "劍湖山世界", "industry": "其他"}, {"symbol": "5703", "name": "亞都麗緻大飯店", "industry": "飯店/觀光"}, {"symbol": "5704", "name": "知本老爺大酒店", "industry": "其他"}, {"symbol": "5864", "name": "致和證券", "industry": "金融"}, {"symbol": "5878", "name": "台名保險經紀人", "industry": "金融"}, {"symbol": "5902", "name": "德記洋行", "industry": "零售"}, {"symbol": "5903", "name": "全家便利商店", "industry": "零售"}, {"symbol": "5904", "name": "寶雅國際", "industry": "零售"}, {"symbol": "5905", "name": "南仁湖育樂", "industry": "零售"}, {"symbol": "6015", "name": "宏遠證券", "industry": "金融"}, {"symbol": "6016", "name": "康和綜合證券", "industry": "金融"}, {"symbol": "6020", "name": "大展證券", "industry": "金融"}, {"symbol": "6021", "name": "美好證券", "industry": "金融"}, {"symbol": "6023", "name": "元大期貨", "industry": "金融"}, {"symbol": "6026", "name": "福邦證券", "industry": "金融"}, {"symbol": "6028", "name": "公勝保險經紀人", "industry": "金融"}, {"symbol": "6101", "name": "寬魚國際", "industry": "電子"}, {"symbol": "6103", "name": "合邦電子", "industry": "電子"}, {"symbol": "6104", "name": "創惟科技", "industry": "電子"}, {"symbol": "6109", "name": "亞元科技", "industry": "電子"}, {"symbol": "6111", "name": "光聚晶電聯合", "industry": "電子"}, {"symbol": "6113", "name": "亞矽科技", "industry": "電子"}, {"symbol": "6114", "name": "久威國際", "industry": "電子"}, {"symbol": "6118", "name": "建達國際", "industry": "電子"}, {"symbol": "6122", "name": "擎邦國際科技工程", "industry": "電子"}, {"symbol": "6123", "name": "上奇科技", "industry": "電子"}, {"symbol": "6124", "name": "業強科技", "industry": "電子"}, {"symbol": "6125", "name": "廣運機械工程", "industry": "電子"}, {"symbol": "6126", "name": "信音企業", "industry": "電子"}, {"symbol": "6127", "name": "九豪精密陶瓷", "industry": "電子"}, {"symbol": "6129", "name": "普誠科技", "industry": "電子"}, {"symbol": "6130", "name": "上亞科技", "industry": "電子"}, {"symbol": "6134", "name": "萬旭電業", "industry": "電子"}, {"symbol": "6138", "name": "茂達電子", "industry": "電源管理"}, {"symbol": "6140", "name": "訊達電腦", "industry": "電子"}, {"symbol": "6143", "name": "振曜科技", "industry": "電子"}, {"symbol": "6144", "name": "得利影視", "industry": "電子"}, {"symbol": "6146", "name": "耕興", "industry": "電子"}, {"symbol": "6148", "name": "驊宏資通", "industry": "電子"}, {"symbol": "6150", "name": "撼訊科技", "industry": "電子"}, {"symbol": "6151", "name": "晉倫科技", "industry": "電子"}, {"symbol": "6154", "name": "順發電腦", "industry": "重電"}, {"symbol": "6156", "name": "松上電子", "industry": "電子"}, {"symbol": "6158", "name": "禾昌興業", "industry": "電子"}, {"symbol": "6160", "name": "欣技資訊", "industry": "電子"}, {"symbol": "6161", "name": "捷波資訊", "industry": "電子"}, {"symbol": "6163", "name": "華電聯網", "industry": "電子"}, {"symbol": "6167", "name": "久正光電", "industry": "電子"}, {"symbol": "6169", "name": "昱泉國際", "industry": "電子"}, {"symbol": "6170", "name": "統振", "industry": "電子"}, {"symbol": "6171", "name": "大城地產", "industry": "電子"}, {"symbol": "6173", "name": "信昌電子陶瓷", "industry": "電子"}, {"symbol": "6174", "name": "安碁科技", "industry": "電子"}, {"symbol": "6175", "name": "立敦科技", "industry": "電子"}, {"symbol": "6179", "name": "亞通利大能源", "industry": "電子"}, {"symbol": "6180", "name": "遊戲橘子數位科技", "industry": "電子"}, {"symbol": "6185", "name": "幃翔精密", "industry": "電子"}, {"symbol": "6186", "name": "新潤興業", "industry": "電子"}, {"symbol": "6188", "name": "廣明光電", "industry": "電子"}, {"symbol": "6190", "name": "萬泰科技", "industry": "電子"}, {"symbol": "6194", "name": "育富電子", "industry": "電子"}, {"symbol": "6195", "name": "詩肯", "industry": "電子"}, {"symbol": "6198", "name": "瑞築建設", "industry": "營建"}, {"symbol": "6199", "name": "天品聯合企業", "industry": "電子"}, {"symbol": "6203", "name": "海韻電子工業", "industry": "電子"}, {"symbol": "6204", "name": "台灣艾華電子工業", "industry": "電子"}, {"symbol": "6207", "name": "雷科", "industry": "電子"}, {"symbol": "6208", "name": "日揚科技", "industry": "電子"}, {"symbol": "6210", "name": "慶生電子", "industry": "電子"}, {"symbol": "6212", "name": "理銘開發", "industry": "電子"}, {"symbol": "6217", "name": "中國探針", "industry": "電子"}, {"symbol": "6218", "name": "豪勉科技", "industry": "電子"}, {"symbol": "6219", "name": "富旺國際開發", "industry": "電子"}, {"symbol": "6220", "name": "岳豐科技", "industry": "電子"}, {"symbol": "6221", "name": "晉泰科技", "industry": "電子"}, {"symbol": "6222", "name": "立軒開發建設", "industry": "營建"}, {"symbol": "6223", "name": "旺矽科技", "industry": "電子"}, {"symbol": "6227", "name": "茂綸", "industry": "電子"}, {"symbol": "6228", "name": "全譜科技", "industry": "電子"}, {"symbol": "6229", "name": "研通科技", "industry": "電子"}, {"symbol": "6233", "name": "旺玖科技", "industry": "電子"}, {"symbol": "6234", "name": "高僑自動化科技", "industry": "電子"}, {"symbol": "6236", "name": "中湛", "industry": "電子"}, {"symbol": "6237", "name": "驊訊電子企業", "industry": "電子"}, {"symbol": "6240", "name": "松崗國際興業", "industry": "電子"}, {"symbol": "6241", "name": "鑫永洋科技", "industry": "電子"}, {"symbol": "6242", "name": "立康生醫事業", "industry": "電子"}, {"symbol": "6244", "name": "茂迪", "industry": "電子"}, {"symbol": "6245", "name": "立端科技", "industry": "電子"}, {"symbol": "6246", "name": "臺龍電子", "industry": "電子"}, {"symbol": "6248", "name": "沛波鋼鐵", "industry": "鋼鐵"}, {"symbol": "6259", "name": "百徽", "industry": "電子"}, {"symbol": "6261", "name": "久元電子", "industry": "IC設計"}, {"symbol": "6263", "name": "普萊德科技", "industry": "電子"}, {"symbol": "6264", "name": "富裔實業", "industry": "電子"}, {"symbol": "6265", "name": "方土昶", "industry": "電子"}, {"symbol": "6266", "name": "泰詠電子", "industry": "電子"}, {"symbol": "6270", "name": "倍微科技", "industry": "電子"}, {"symbol": "6275", "name": "元山科技工業", "industry": "電子"}, {"symbol": "6276", "name": "安鈦克科技", "industry": "電子"}, {"symbol": "6279", "name": "胡連精密", "industry": "電子"}, {"symbol": "6284", "name": "佳邦科技", "industry": "電子"}, {"symbol": "6290", "name": "良維科技", "industry": "電子"}, {"symbol": "6291", "name": "沛亨半導體", "industry": "電子"}, {"symbol": "6292", "name": "迅德興業", "industry": "電子"}, {"symbol": "6294", "name": "智基科技開發", "industry": "電子"}, {"symbol": "6411", "name": "晶焱科技", "industry": "電子"}, {"symbol": "6417", "name": "韋僑科技", "industry": "電子"}, {"symbol": "6418", "name": "詠昇電子", "industry": "電子"}, {"symbol": "6419", "name": "京晨科技", "industry": "電子"}, {"symbol": "6423", "name": "億而得微電子", "industry": "電子"}, {"symbol": "6425", "name": "易發精機", "industry": "電子"}, {"symbol": "6432", "name": "今展科技", "industry": "電子"}, {"symbol": "6435", "name": "大中積體電路", "industry": "電源管理"}, {"symbol": "6441", "name": "廣錠科技", "industry": "電子"}, {"symbol": "6461", "name": "益得生物科技", "industry": "電子"}, {"symbol": "6462", "name": "神盾", "industry": "電子"}, {"symbol": "6465", "name": "威潤科技", "industry": "電子"}, {"symbol": "6469", "name": "大樹醫藥", "industry": "生技"}, {"symbol": "6470", "name": "宇智網通", "industry": "光纖/網通"}, {"symbol": "6474", "name": "華豫寧", "industry": "電子"}, {"symbol": "6482", "name": "弘煜科技事業", "industry": "電子"}, {"symbol": "6485", "name": "點序科技", "industry": "電子"}, {"symbol": "6486", "name": "互動國際數位", "industry": "電子"}, {"symbol": "6492", "name": "生華生物科技", "industry": "電子"}, {"symbol": "6494", "name": "九齊科技", "industry": "電子"}, {"symbol": "6496", "name": "科懋生物科技", "industry": "電子"}, {"symbol": "6498", "name": "久禾光電", "industry": "電子"}, {"symbol": "6499", "name": "益安生醫", "industry": "電子"}, {"symbol": "6506", "name": "雙邦實業", "industry": "石化"}, {"symbol": "6508", "name": "惠光", "industry": "石化"}, {"symbol": "6509", "name": "聚和國際", "industry": "石化"}, {"symbol": "6510", "name": "中華精測科技", "industry": "石化"}, {"symbol": "6512", "name": "啟發電子", "industry": "重電"}, {"symbol": "6516", "name": "勤崴國際科技", "industry": "石化"}, {"symbol": "6517", "name": "保勝光學", "industry": "石化"}, {"symbol": "6523", "name": "達爾膚生醫科技", "industry": "石化"}, {"symbol": "6527", "name": "明達醫學科技", "industry": "石化"}, {"symbol": "6530", "name": "創威光電", "industry": "石化"}, {"symbol": "6532", "name": "瑞耘科技", "industry": "石化"}, {"symbol": "6535", "name": "順天醫藥生技", "industry": "生技"}, {"symbol": "6538", "name": "倉和", "industry": "石化"}, {"symbol": "6542", "name": "隆中網絡", "industry": "石化"}, {"symbol": "6546", "name": "正基科技", "industry": "石化"}, {"symbol": "6548", "name": "長華科技", "industry": "石化"}, {"symbol": "6556", "name": "勝品電通", "industry": "石化"}, {"symbol": "6560", "name": "欣普羅光電", "industry": "石化"}, {"symbol": "6561", "name": "是方電訊", "industry": "石化"}, {"symbol": "6568", "name": "宏觀微電子", "industry": "石化"}, {"symbol": "6569", "name": "醫揚科技", "industry": "石化"}, {"symbol": "6570", "name": "維田科技", "industry": "石化"}, {"symbol": "6574", "name": "霈方國際", "industry": "石化"}, {"symbol": "6576", "name": "逸達生物科技", "industry": "石化"}, {"symbol": "6577", "name": "勁豐電子", "industry": "石化"}, {"symbol": "6578", "name": "達邦蛋白生技", "industry": "生技"}, {"symbol": "6584", "name": "南俊國際", "industry": "石化"}, {"symbol": "6588", "name": "東典光電科技", "industry": "石化"}, {"symbol": "6590", "name": "普鴻資訊", "industry": "石化"}, {"symbol": "6593", "name": "台灣銘板", "industry": "石化"}, {"symbol": "6596", "name": "寬宏藝術經紀", "industry": "石化"}, {"symbol": "6597", "name": "立誠光電", "industry": "石化"}, {"symbol": "6603", "name": "富強鑫精密工業", "industry": "電子"}, {"symbol": "6609", "name": "台灣瀧澤科技", "industry": "電子"}, {"symbol": "6612", "name": "應用奈米醫材科技", "industry": "生技"}, {"symbol": "6613", "name": "朋億", "industry": "電子"}, {"symbol": "6615", "name": "慧智基因", "industry": "生技"}, {"symbol": "6616", "name": "特昇國際", "industry": "電子"}, {"symbol": "6617", "name": "共信醫藥科技控股", "industry": "生技"}, {"symbol": "6620", "name": "漢達生技醫藥", "industry": "生技"}, {"symbol": "6624", "name": "萬年清環境工程", "industry": "電子"}, {"symbol": "6629", "name": "泰金投資控股", "industry": "電子"}, {"symbol": "6637", "name": "醫影", "industry": "電子"}, {"symbol": "6640", "name": "均華精密工業", "industry": "電子"}, {"symbol": "6642", "name": "富致科技", "industry": "電子"}, {"symbol": "6643", "name": "&#20870;星科技", "industry": "IC設計"}, {"symbol": "6649", "name": "台灣生醫材料", "industry": "生技"}, {"symbol": "6651", "name": "全宇昕科技", "industry": "電源管理"}, {"symbol": "6654", "name": "天正國際精密機械股份有限���司", "industry": "電子"}, {"symbol": "6661", "name": "威健", "industry": "電子"}, {"symbol": "6662", "name": "樂斯科生物科技", "industry": "電子"}, {"symbol": "6664", "name": "群翊工業", "industry": "電子"}, {"symbol": "6667", "name": "信紘科技", "industry": "電子"}, {"symbol": "6679", "name": "鈺太科技", "industry": "電子"}, {"symbol": "6680", "name": "鑫創電子", "industry": "電子"}, {"symbol": "6683", "name": "雍智科技", "industry": "電子"}, {"symbol": "6684", "name": "安格科技", "industry": "電子"}, {"symbol": "6690", "name": "安碁資訊", "industry": "電子"}, {"symbol": "6692", "name": "進金生能源服務", "industry": "電子"}, {"symbol": "6693", "name": "廣閎科技", "industry": "電源管理"}, {"symbol": "6697", "name": "東捷資訊服務", "industry": "電子"}, {"symbol": "6703", "name": "軒郁國際", "industry": "電子"}, {"symbol": "6708", "name": "天擎積體電路", "industry": "電子"}, {"symbol": "6712", "name": "長聖國際生技", "industry": "生技"}, {"symbol": "6716", "name": "應廣科技", "industry": "電子"}, {"symbol": "6720", "name": "久昌科技", "industry": "電子"}, {"symbol": "6721", "name": "信實保全", "industry": "電子"}, {"symbol": "6725", "name": "台灣矽科宏晟科技", "industry": "電子"}, {"symbol": "6727", "name": "亞泰金屬工業", "industry": "電子"}, {"symbol": "6728", "name": "上洋產業", "industry": "電子"}, {"symbol": "6730", "name": "常廣", "industry": "電子"}, {"symbol": "6732", "name": "昇佳電子", "industry": "電子"}, {"symbol": "6733", "name": "博晟生醫", "industry": "電子"}, {"symbol": "6735", "name": "美達科技", "industry": "電子"}, {"symbol": "6739", "name": "竹陞科技", "industry": "電子"}, {"symbol": "6741", "name": "91APP, Inc.", "industry": "電子"}, {"symbol": "6751", "name": "智聯服務", "industry": "電子"}, {"symbol": "6752", "name": "叡揚資訊", "industry": "電子"}, {"symbol": "6761", "name": "穩得實業", "industry": "電子"}, {"symbol": "6762", "name": "達亞國際", "industry": "電子"}, {"symbol": "6763", "name": "綠界科技", "industry": "電子"}, {"symbol": "6767", "name": "台灣微創醫療器材", "industry": "生技"}, {"symbol": "6785", "name": "昱展新藥生技", "industry": "生技"}, {"symbol": "6788", "name": "華景電通", "industry": "電子"}, {"symbol": "6791", "name": "虎門科技", "industry": "電子"}, {"symbol": "6803", "name": "崑鼎綠能環保", "industry": "綠能"}, {"symbol": "6804", "name": "明係事業", "industry": "電子"}, {"symbol": "6811", "name": "宏碁資訊服務", "industry": "電子"}, {"symbol": "6821", "name": "聯寶電子", "industry": "電子"}, {"symbol": "6823", "name": "濾能股份���限公司", "industry": "電子"}, {"symbol": "6829", "name": "千附精密", "industry": "電子"}, {"symbol": "6840", "name": "東研信超", "industry": "電子"}, {"symbol": "6841", "name": "長佳智能", "industry": "電子"}, {"symbol": "6843", "name": "進典工業", "industry": "電子"}, {"symbol": "6844", "name": "諾貝兒寶貝", "industry": "電子"}, {"symbol": "6846", "name": "綠茵生技", "industry": "生技"}, {"symbol": "6855", "name": "數泓科技", "industry": "電子"}, {"symbol": "6856", "name": "鑫傳國際多媒體科技", "industry": "電子"}, {"symbol": "6859", "name": "伯特光電", "industry": "電子"}, {"symbol": "6865", "name": "偉康科技", "industry": "電子"}, {"symbol": "6870", "name": "騰雲科技服務", "industry": "電子"}, {"symbol": "6872", "name": "浩宇生醫", "industry": "電子"}, {"symbol": "6874", "name": "倍力資訊", "industry": "電子"}, {"symbol": "6875", "name": "國邑藥品科技", "industry": "生技"}, {"symbol": "6877", "name": "鏵友益科技", "industry": "電子"}, {"symbol": "6881", "name": "潤德室內裝修設計工程(股)公司", "industry": "電子"}, {"symbol": "6884", "name": "海柏特", "industry": "電子"}, {"symbol": "6894", "name": "衛司特科技", "industry": "電子"}, {"symbol": "6895", "name": "宏碩系統", "industry": "電子"}, {"symbol": "6899", "name": "創為精密材料", "industry": "電子"}, {"symbol": "6903", "name": "巨漢系統科技", "industry": "其他"}, {"symbol": "6904", "name": "伯鑫工具", "industry": "其他"}, {"symbol": "6907", "name": "雅特力科技(開曼)", "industry": "其他"}, {"symbol": "6910", "name": "德鴻科技", "industry": "其他"}, {"symbol": "6913", "name": "鴻呈實業", "industry": "其他"}, {"symbol": "6922", "name": "宸曜科技", "industry": "其他"}, {"symbol": "6925", "name": "意藍資訊", "industry": "其他"}, {"symbol": "6929", "name": "佑全藥品", "industry": "生技"}, {"symbol": "6953", "name": "家碩科技", "industry": "其他"}, {"symbol": "6961", "name": "旅天下聯合國際旅行社(股)公司", "industry": "其他"}, {"symbol": "6967", "name": "汎瑋材料科技", "industry": "其他"}, {"symbol": "6968", "name": "萬達寵物事業", "industry": "其他"}, {"symbol": "6971", "name": "惠民實業", "industry": "其他"}, {"symbol": "6982", "name": "大井泵浦工業", "industry": "其他"}, {"symbol": "6996", "name": "力領科技", "industry": "其他"}, {"symbol": "6997", "name": "博弘雲端科技", "industry": "其他"}, {"symbol": "7402", "name": "邑錡", "industry": "其他"}, {"symbol": "7547", "name": "碩網資訊", "industry": "其他"}, {"symbol": "7556", "name": "意德士科技", "industry": "其他"}, {"symbol": "7584", "name": "樂意傳播", "industry": "其他"}, {"symbol": "7642", "name": "昶瑞機電", "industry": "其他"}, {"symbol": "7703", "name": "銳澤實業", "industry": "其他"}, {"symbol": "7704", "name": "明遠精密科技", "industry": "其他"}, {"symbol": "7708", "name": "全家國際餐飲", "industry": "餐飲"}, {"symbol": "7709", "name": "榮田精機", "industry": "其他"}, {"symbol": "7712", "name": "博盛半導體", "industry": "其他"}, {"symbol": "7713", "name": "威力德生醫", "industry": "其他"}, {"symbol": "7714", "name": "創泓科技", "industry": "其他"}, {"symbol": "7715", "name": "裕山環境工程", "industry": "其他"}, {"symbol": "7716", "name": "昱臺國際", "industry": "其他"}, {"symbol": "7717", "name": "英屬開曼群島商萊德光電(股)公司", "industry": "其他"}, {"symbol": "7718", "name": "友鋮", "industry": "其他"}, {"symbol": "7723", "name": "築間餐飲事業", "industry": "餐飲"}, {"symbol": "7728", "name": "光焱科技", "industry": "其他"}, {"symbol": "7734", "name": "印能科技", "industry": "其他"}, {"symbol": "7738", "name": "東聯互動", "industry": "其他"}, {"symbol": "7743", "name": "金利食安科技", "industry": "其他"}, {"symbol": "7744", "name": "崴寶精密科技", "industry": "其他"}, {"symbol": "7747", "name": "昕奇雲端科技", "industry": "其他"}, {"symbol": "7751", "name": "竑騰科技", "industry": "其他"}, {"symbol": "7753", "name": "星亞視覺", "industry": "其他"}, {"symbol": "7757", "name": "金色三麥餐飲", "industry": "餐飲"}, {"symbol": "7767", "name": "仁大資訊", "industry": "其他"}, {"symbol": "7770", "name": "君曜科技", "industry": "其他"}, {"symbol": "7772", "name": "耀穎光電", "industry": "其他"}, {"symbol": "7777", "name": "能率亞洲資本", "industry": "其他"}, {"symbol": "7782", "name": "光速火箭", "industry": "其他"}, {"symbol": "7792", "name": "安葆國際實業", "industry": "其他"}, {"symbol": "7794", "name": "宏碁智新", "industry": "其他"}, {"symbol": "7805", "name": "威聯通科技", "industry": "其他"}, {"symbol": "7810", "name": "捷創科技", "industry": "其他"}, {"symbol": "7811", "name": "民盛應用企業", "industry": "其他"}, {"symbol": "7820", "name": "立盈環保科技", "industry": "其他"}, {"symbol": "7828", "name": "創新服務", "industry": "其他"}, {"symbol": "7842", "name": "天能綠電", "industry": "其他"}, {"symbol": "8024", "name": "佑華微電子", "industry": "電子"}, {"symbol": "8027", "name": "鈦昇科技", "industry": "電子"}, {"symbol": "8032", "name": "光菱電子", "industry": "電子"}, {"symbol": "8034", "name": "榮群電訊", "industry": "電子"}, {"symbol": "8038", "name": "長園科技實業", "industry": "電子"}, {"symbol": "8040", "name": "九暘電子", "industry": "電子"}, {"symbol": "8042", "name": "臺灣金山電子工業", "industry": "電子"}, {"symbol": "8043", "name": "蜜望實企業", "industry": "電子"}, {"symbol": "8044", "name": "網路家庭國際資訊", "industry": "電子"}, {"symbol": "8047", "name": "星雲電腦", "industry": "電子"}, {"symbol": "8048", "name": "德勝科技", "industry": "電子"}, {"symbol": "8049", "name": "晶采光電科技", "industry": "電子"}, {"symbol": "8050", "name": "廣積科技", "industry": "電子"}, {"symbol": "8054", "name": "安國國際科技", "industry": "電子"}, {"symbol": "8059", "name": "凱碩科技", "industry": "電子"}, {"symbol": "8064", "name": "東捷科技", "industry": "電子"}, {"symbol": "8066", "name": "來思達國際企業", "industry": "電子"}, {"symbol": "8067", "name": "志旭國際", "industry": "電子"}, {"symbol": "8068", "name": "全達國際", "industry": "電子"}, {"symbol": "8071", "name": "能率網通", "industry": "光纖/網通"}, {"symbol": "8074", "name": "鉅橡企業", "industry": "電子"}, {"symbol": "8076", "name": "伍豐科技", "industry": "電子"}, {"symbol": "8077", "name": "洛碁實業", "industry": "電子"}, {"symbol": "8080", "name": "泰霖事業", "industry": "電子"}, {"symbol": "8083", "name": "瑞穎", "industry": "電子"}, {"symbol": "8084", "name": "巨虹電子", "industry": "電子"}, {"symbol": "8085", "name": "福華電子", "industry": "電子"}, {"symbol": "8086", "name": "宏捷科技", "industry": "電子"}, {"symbol": "8087", "name": "麗升能源科技", "industry": "電子"}, {"symbol": "8088", "name": "品安科技", "industry": "電子"}, {"symbol": "8089", "name": "康全電訊", "industry": "電子"}, {"symbol": "8091", "name": "翔名科技", "industry": "電子"}, {"symbol": "8092", "name": "建暐精密科技", "industry": "電子"}, {"symbol": "8093", "name": "保銳科技", "industry": "電子"}, {"symbol": "8096", "name": "擎亞電子", "industry": "電子"}, {"symbol": "8097", "name": "常珵科技", "industry": "電子"}, {"symbol": "8099", "name": "大同世界科技", "industry": "電子"}, {"symbol": "8102", "name": "傑霖科技", "industry": "其他"}, {"symbol": "8107", "name": "大億金茂", "industry": "其他"}, {"symbol": "8109", "name": "博大科技", "industry": "其他"}, {"symbol": "8111", "name": "立碁電子工業", "industry": "其他"}, {"symbol": "8121", "name": "越峰電子材料", "industry": "其他"}, {"symbol": "8147", "name": "正淩精密工業", "industry": "其他"}, {"symbol": "8155", "name": "博智電子", "industry": "其他"}, {"symbol": "8171", "name": "天宇工業", "industry": "其他"}, {"symbol": "8176", "name": "智捷科技", "industry": "其他"}, {"symbol": "8182", "name": "加高電子", "industry": "其他"}, {"symbol": "8183", "name": "台灣精星科技", "industry": "其他"}, {"symbol": "8227", "name": "巨有科技", "industry": "電子"}, {"symbol": "8234", "name": "新漢", "industry": "電子"}, {"symbol": "8240", "name": "華宏新技", "industry": "電子"}, {"symbol": "8255", "name": "朋程科技", "industry": "電子"}, {"symbol": "8272", "name": "全景軟體", "industry": "電子"}, {"symbol": "8277", "name": "商丞科技", "industry": "電子"}, {"symbol": "8279", "name": "生展生物科技", "industry": "電子"}, {"symbol": "8284", "name": "三竹資訊", "industry": "電子"}, {"symbol": "8289", "name": "泰藝電子", "industry": "電子"}, {"symbol": "8291", "name": "尚茂電子材料", "industry": "電子"}, {"symbol": "8342", "name": "益張實業", "industry": "電子"}, {"symbol": "8349", "name": "恒耀國際", "industry": "電子"}, {"symbol": "8354", "name": "冠好科技", "industry": "電子"}, {"symbol": "8358", "name": "金居開發", "industry": "PCB"}, {"symbol": "8383", "name": "千附實業", "industry": "電子"}, {"symbol": "8390", "name": "金益鼎企業", "industry": "電子"}, {"symbol": "8401", "name": "白紗科技印刷", "industry": "零售"}, {"symbol": "8403", "name": "盛弘醫藥", "industry": "生技"}, {"symbol": "8409", "name": "商之器科技", "industry": "零售"}, {"symbol": "8410", "name": "森田印刷廠", "industry": "零售"}, {"symbol": "8415", "name": "大成國際鋼鐵", "industry": "鋼鐵"}, {"symbol": "8416", "name": "實威國際", "industry": "零售"}, {"symbol": "8421", "name": "旭源包裝科技", "industry": "零售"}, {"symbol": "8423", "name": "保綠資源", "industry": "零售"}, {"symbol": "8424", "name": "惠普", "industry": "零售"}, {"symbol": "8426", "name": "紅木集團", "industry": "零售"}, {"symbol": "8431", "name": "匯鑽科技", "industry": "零售"}, {"symbol": "8432", "name": "東生華製藥", "industry": "生技"}, {"symbol": "8433", "name": "弘帆", "industry": "零售"}, {"symbol": "8435", "name": "台灣鉅邁", "industry": "零售"}, {"symbol": "8436", "name": "大江生醫", "industry": "零售"}, {"symbol": "8437", "name": "大地幼教", "industry": "零售"}, {"symbol": "8440", "name": "綠電再生", "industry": "零售"}, {"symbol": "8444", "name": "綠河", "industry": "零售"}, {"symbol": "8446", "name": "華研國際音樂", "industry": "零售"}, {"symbol": "8450", "name": "霹靂國際多媒體", "industry": "零售"}, {"symbol": "8455", "name": "蓋曼群島商日本大拓", "industry": "零售"}, {"symbol": "8472", "name": "夠麻吉", "industry": "零售"}, {"symbol": "8477", "name": "創業家數位", "industry": "零售"}, {"symbol": "8489", "name": "三貝德數位文創", "industry": "零售"}, {"symbol": "8905", "name": "裕國冷凍冷藏", "industry": "其他"}, {"symbol": "8906", "name": "花王企業", "industry": "其他"}, {"symbol": "8908", "name": "欣雄天然氣", "industry": "其他"}, {"symbol": "8916", "name": "光隆實業", "industry": "其他"}, {"symbol": "8917", "name": "欣泰石油氣", "industry": "其他"}, {"symbol": "8921", "name": "沈氏藝術印刷", "industry": "其他"}, {"symbol": "8923", "name": "時報文化出版企業", "industry": "其他"}, {"symbol": "8924", "name": "大田精密工業", "industry": "其他"}, {"symbol": "8927", "name": "北基國際", "industry": "其他"}, {"symbol": "8928", "name": "鉅明", "industry": "其他"}, {"symbol": "8929", "name": "富堡工業", "industry": "其他"}, {"symbol": "8930", "name": "青鋼應用材料", "industry": "鋼鐵"}, {"symbol": "8931", "name": "大園汽電共生", "industry": "其他"}, {"symbol": "8932", "name": "智通科創", "industry": "其他"}, {"symbol": "8933", "name": "愛地雅工業", "industry": "其他"}, {"symbol": "8935", "name": "邦泰複合材料", "industry": "其他"}, {"symbol": "8936", "name": "國統國際", "industry": "其他"}, {"symbol": "8937", "name": "合騏工業", "industry": "其他"}, {"symbol": "8938", "name": "明安國際企業", "industry": "其他"}, {"symbol": "8941", "name": "關中", "industry": "其他"}, {"symbol": "8942", "name": "森鉅科技材料", "industry": "其他"}, {"symbol": "9949", "name": "琉園", "industry": "其他"}, {"symbol": "9950", "name": "萬國通路", "industry": "其他"}, {"symbol": "9951", "name": "皇田工業", "industry": "其他"}, {"symbol": "9960", "name": "邁達康網路事業", "industry": "其他"}, {"symbol": "9962", "name": "有益鋼鐵", "industry": "鋼鐵"}, {"symbol": "1103", "name": "嘉泥", "industry": "水泥"}, {"symbol": "1104", "name": "環泥", "industry": "水泥"}, {"symbol": "1108", "name": "幸福", "industry": "水泥"}, {"symbol": "1109", "name": "信大", "industry": "水泥"}, {"symbol": "1110", "name": "東泥", "industry": "其他"}, {"symbol": "1201", "name": "味全", "industry": "食品"}, {"symbol": "1203", "name": "味王", "industry": "食品"}, {"symbol": "1210", "name": "大成", "industry": "食品"}, {"symbol": "1213", "name": "大飲", "industry": "食品"}, {"symbol": "1215", "name": "卜蜂", "industry": "食品"}, {"symbol": "1217", "name": "愛之味", "industry": "食品"}, {"symbol": "1218", "name": "泰山", "industry": "食品"}, {"symbol": "1219", "name": "福壽", "industry": "食品"}, {"symbol": "1220", "name": "台榮", "industry": "食品"}, {"symbol": "1225", "name": "福懋油", "industry": "食品"}, {"symbol": "1227", "name": "佳格", "industry": "食品"}, {"symbol": "1229", "name": "聯華", "industry": "食品"}, {"symbol": "1231", "name": "聯華食", "industry": "食品"}, {"symbol": "1232", "name": "大統益", "industry": "食品"}, {"symbol": "1233", "name": "天仁", "industry": "食品"}, {"symbol": "1234", "name": "黑松", "industry": "食品"}, {"symbol": "1235", "name": "興泰", "industry": "食品"}, {"symbol": "1236", "name": "宏亞", "industry": "食品"}, {"symbol": "1256", "name": "鮮活果汁-KY", "industry": "食品"}, {"symbol": "1304", "name": "台聚", "industry": "石化"}, {"symbol": "1305", "name": "華夏", "industry": "石化"}, {"symbol": "1307", "name": "三芳", "industry": "石化"}, {"symbol": "1308", "name": "亞聚", "industry": "石化"}, {"symbol": "1309", "name": "台達化", "industry": "石化"}, {"symbol": "1310", "name": "台苯", "industry": "石化"}, {"symbol": "1312", "name": "國喬", "industry": "石化"}, {"symbol": "1313", "name": "聯成", "industry": "石化"}, {"symbol": "1314", "name": "中石化", "industry": "石化"}, {"symbol": "1315", "name": "達新", "industry": "石化"}, {"symbol": "1316", "name": "上曜", "industry": "石化"}, {"symbol": "1319", "name": "東陽", "industry": "石化"}, {"symbol": "1321", "name": "大洋", "industry": "石化"}, {"symbol": "1323", "name": "永裕", "industry": "石化"}, {"symbol": "1324", "name": "地球", "industry": "石化"}, {"symbol": "1325", "name": "恆大", "industry": "石化"}, {"symbol": "1337", "name": "再生-KY", "industry": "石化"}, {"symbol": "1338", "name": "廣華-KY", "industry": "石化"}, {"symbol": "1339", "name": "昭輝", "industry": "石化"}, {"symbol": "1340", "name": "勝悅-KY", "industry": "石化"}, {"symbol": "1341", "name": "富林-KY", "industry": "石化"}, {"symbol": "1342", "name": "八貫", "industry": "石化"}, {"symbol": "1409", "name": "新纖", "industry": "紡織"}, {"symbol": "1410", "name": "南染", "industry": "紡織"}, {"symbol": "1413", "name": "宏洲", "industry": "紡織"}, {"symbol": "1414", "name": "東和", "industry": "紡織"}, {"symbol": "1416", "name": "廣豐", "industry": "紡織"}, {"symbol": "1417", "name": "嘉裕", "industry": "紡織"}, {"symbol": "1418", "name": "東華", "industry": "紡織"}, {"symbol": "1419", "name": "新紡", "industry": "紡織"}, {"symbol": "1423", "name": "利華", "industry": "紡織"}, {"symbol": "1432", "name": "大魯閣", "industry": "紡織"}, {"symbol": "1434", "name": "福懋", "industry": "紡織"}, {"symbol": "1435", "name": "中福", "industry": "紡織"}, {"symbol": "1436", "name": "華友聯", "industry": "紡織"}, {"symbol": "1437", "name": "勤益控", "industry": "紡織"}, {"symbol": "1438", "name": "三地開發", "industry": "紡織"}, {"symbol": "1439", "name": "雋揚", "industry": "紡織"}, {"symbol": "1440", "name": "南紡", "industry": "紡織"}, {"symbol": "1441", "name": "大東", "industry": "紡織"}, {"symbol": "1442", "name": "名軒", "industry": "紡織"}, {"symbol": "1443", "name": "立益物流", "industry": "航運"}, {"symbol": "1444", "name": "力麗", "industry": "紡織"}, {"symbol": "1445", "name": "大宇", "industry": "紡織"}, {"symbol": "1446", "name": "宏和", "industry": "紡織"}, {"symbol": "1447", "name": "力鵬", "industry": "紡織"}, {"symbol": "1449", "name": "佳和", "industry": "紡織"}, {"symbol": "1451", "name": "年興", "industry": "紡織"}, {"symbol": "1452", "name": "宏益", "industry": "紡織"}, {"symbol": "1453", "name": "大將", "industry": "紡織"}, {"symbol": "1454", "name": "台富", "industry": "紡織"}, {"symbol": "1455", "name": "集盛", "industry": "紡織"}, {"symbol": "1456", "name": "怡華", "industry": "紡織"}, {"symbol": "1457", "name": "宜進", "industry": "紡織"}, {"symbol": "1459", "name": "聯發", "industry": "紡織"}, {"symbol": "1460", "name": "宏遠", "industry": "紡織"}, {"symbol": "1463", "name": "強盛新", "industry": "紡織"}, {"symbol": "1464", "name": "得力", "industry": "紡織"}, {"symbol": "1465", "name": "偉全", "industry": "紡織"}, {"symbol": "1466", "name": "聚隆", "industry": "紡織"}, {"symbol": "1467", "name": "南緯", "industry": "紡織"}, {"symbol": "1468", "name": "昶和", "industry": "紡織"}, {"symbol": "1470", "name": "大統新創", "industry": "紡織"}, {"symbol": "1471", "name": "首利", "industry": "紡織"}, {"symbol": "1472", "name": "三洋實業", "industry": "紡織"}, {"symbol": "1473", "name": "台南", "industry": "紡織"}, {"symbol": "1474", "name": "弘裕", "industry": "紡織"}, {"symbol": "1475", "name": "業旺", "industry": "紡織"}, {"symbol": "1477", "name": "聚陽", "industry": "紡織"}, {"symbol": "1503", "name": "士電", "industry": "重電"}, {"symbol": "1506", "name": "正道", "industry": "重電"}, {"symbol": "1512", "name": "瑞利", "industry": "重電"}, {"symbol": "1513", "name": "中興電", "industry": "重電"}, {"symbol": "1514", "name": "亞力", "industry": "重電"}, {"symbol": "1515", "name": "力山", "industry": "重電"}, {"symbol": "1516", "name": "川飛", "industry": "重電"}, {"symbol": "1517", "name": "利奇", "industry": "重電"}, {"symbol": "1521", "name": "大億", "industry": "重電"}, {"symbol": "1522", "name": "堤維西", "industry": "重電"}, {"symbol": "1524", "name": "耿鼎", "industry": "重電"}, {"symbol": "1525", "name": "江申", "industry": "重電"}, {"symbol": "1526", "name": "日馳", "industry": "重電"}, {"symbol": "1527", "name": "鑽全", "industry": "重電"}, {"symbol": "1528", "name": "恩德", "industry": "重電"}, {"symbol": "1529", "name": "樂事綠能", "industry": "綠能"}, {"symbol": "1530", "name": "亞崴", "industry": "重電"}, {"symbol": "1531", "name": "高林股", "industry": "重電"}, {"symbol": "1532", "name": "勤美", "industry": "重電"}, {"symbol": "1533", "name": "車王電", "industry": "重電"}, {"symbol": "1535", "name": "中宇", "industry": "重電"}, {"symbol": "1536", "name": "和大", "industry": "汽車零件"}, {"symbol": "1537", "name": "廣隆", "industry": "重電"}, {"symbol": "1538", "name": "正峰", "industry": "重電"}, {"symbol": "1539", "name": "巨庭", "industry": "重電"}, {"symbol": "1540", "name": "喬福", "industry": "重電"}, {"symbol": "1541", "name": "錩泰", "industry": "重電"}, {"symbol": "1558", "name": "伸興", "industry": "重電"}, {"symbol": "1560", "name": "中砂", "industry": "重電"}, {"symbol": "1563", "name": "巧新", "industry": "重電"}, {"symbol": "1568", "name": "倉佑", "industry": "重電"}, {"symbol": "1582", "name": "信錦", "industry": "重電"}, {"symbol": "1583", "name": "程泰", "industry": "重電"}, {"symbol": "1587", "name": "吉茂", "industry": "重電"}, {"symbol": "1589", "name": "永冠-KY", "industry": "重電"}, {"symbol": "1597", "name": "直得", "industry": "重電"}, {"symbol": "1598", "name": "岱宇", "industry": "重電"}, {"symbol": "1603", "name": "華電", "industry": "重電"}, {"symbol": "1604", "name": "聲寶", "industry": "重電"}, {"symbol": "1608", "name": "華榮", "industry": "重電"}, {"symbol": "1609", "name": "大亞", "industry": "重電"}, {"symbol": "1611", "name": "中電", "industry": "重電"}, {"symbol": "1612", "name": "宏泰", "industry": "重電"}, {"symbol": "1614", "name": "三洋電", "industry": "重電"}, {"symbol": "1615", "name": "大山", "industry": "重電"}, {"symbol": "1616", "name": "億泰", "industry": "重電"}, {"symbol": "1617", "name": "榮星", "industry": "重電"}, {"symbol": "1618", "name": "合機", "industry": "重電"}, {"symbol": "1623", "name": "大東電", "industry": "重電"}, {"symbol": "1626", "name": "艾美特-KY", "industry": "重電"}, {"symbol": "1702", "name": "南僑", "industry": "食品"}, {"symbol": "1707", "name": "葡萄王", "industry": "食品"}, {"symbol": "1708", "name": "東鹼", "industry": "食品"}, {"symbol": "1709", "name": "和益", "industry": "食品"}, {"symbol": "1710", "name": "東聯", "industry": "食品"}, {"symbol": "1711", "name": "永光", "industry": "食品"}, {"symbol": "1712", "name": "興農", "industry": "食品"}, {"symbol": "1713", "name": "國化", "industry": "食品"}, {"symbol": "1714", "name": "和桐", "industry": "食品"}, {"symbol": "1717", "name": "長興", "industry": "食品"}, {"symbol": "1718", "name": "中纖", "industry": "食品"}, {"symbol": "1720", "name": "生達", "industry": "食品"}, {"symbol": "1721", "name": "三晃", "industry": "食品"}, {"symbol": "1722", "name": "台肥", "industry": "食品"}, {"symbol": "1723", "name": "中碳", "industry": "食品"}, {"symbol": "1725", "name": "元禎", "industry": "食品"}, {"symbol": "1726", "name": "永記", "industry": "食品"}, {"symbol": "1727", "name": "中華化", "industry": "食品"}, {"symbol": "1730", "name": "花仙子", "industry": "食品"}, {"symbol": "1731", "name": "美吾華", "industry": "食品"}, {"symbol": "1732", "name": "毛寶", "industry": "紡織"}, {"symbol": "1733", "name": "五鼎", "industry": "食品"}, {"symbol": "1734", "name": "杏輝", "industry": "食品"}, {"symbol": "1735", "name": "日勝化", "industry": "食品"}, {"symbol": "1736", "name": "喬山", "industry": "食品"}, {"symbol": "1737", "name": "臺鹽", "industry": "食品"}, {"symbol": "1752", "name": "南光", "industry": "食品"}, {"symbol": "1760", "name": "寶齡富錦", "industry": "食品"}, {"symbol": "1762", "name": "中化生", "industry": "食品"}, {"symbol": "1773", "name": "勝一", "industry": "食品"}, {"symbol": "1776", "name": "展宇", "industry": "食品"}, {"symbol": "1783", "name": "和康生", "industry": "食品"}, {"symbol": "1786", "name": "科妍", "industry": "食品"}, {"symbol": "1789", "name": "神隆", "industry": "食品"}, {"symbol": "1795", "name": "美時", "industry": "食品"}, {"symbol": "1802", "name": "台玻", "industry": "其他製造"}, {"symbol": "1805", "name": "寶徠", "industry": "其他製造"}, {"symbol": "1806", "name": "冠軍", "industry": "其他製造"}, {"symbol": "1808", "name": "潤隆", "industry": "其他製造"}, {"symbol": "1809", "name": "中釉", "industry": "其他製造"}, {"symbol": "1810", "name": "和成", "industry": "其他製造"}, {"symbol": "1817", "name": "凱撒衛", "industry": "其他製造"}, {"symbol": "1903", "name": "士紙", "industry": "其他製造"}, {"symbol": "1904", "name": "正隆", "industry": "其他製造"}, {"symbol": "1905", "name": "華紙", "industry": "其他製造"}, {"symbol": "1906", "name": "寶隆", "industry": "其他製造"}, {"symbol": "1907", "name": "永豐餘", "industry": "其他製造"}, {"symbol": "1909", "name": "榮成", "industry": "其他製造"}, {"symbol": "2006", "name": "東和鋼鐵", "industry": "鋼鐵"}, {"symbol": "2007", "name": "燁興", "industry": "鋼鐵"}, {"symbol": "2008", "name": "高興昌", "industry": "鋼鐵"}, {"symbol": "2009", "name": "第一銅", "industry": "鋼鐵"}, {"symbol": "2010", "name": "春源", "industry": "鋼鐵"}, {"symbol": "2012", "name": "春雨", "industry": "鋼鐵"}, {"symbol": "2013", "name": "中鋼構", "industry": "鋼鐵"}, {"symbol": "2014", "name": "中鴻", "industry": "鋼鐵"}, {"symbol": "2015", "name": "豐興", "industry": "鋼鐵"}, {"symbol": "2017", "name": "官田鋼", "industry": "鋼鐵"}, {"symbol": "2020", "name": "美亞", "industry": "鋼鐵"}, {"symbol": "2022", "name": "聚亨", "industry": "鋼鐵"}, {"symbol": "2023", "name": "燁輝", "industry": "鋼鐵"}, {"symbol": "2024", "name": "志聯", "industry": "鋼鐵"}, {"symbol": "2025", "name": "千興", "industry": "鋼鐵"}, {"symbol": "2027", "name": "大成鋼", "industry": "鋼鐵"}, {"symbol": "2028", "name": "威致", "industry": "鋼鐵"}, {"symbol": "2029", "name": "盛餘", "industry": "鋼鐵"}, {"symbol": "2030", "name": "彰源", "industry": "鋼鐵"}, {"symbol": "2031", "name": "新光鋼", "industry": "鋼鐵"}, {"symbol": "2032", "name": "新鋼", "industry": "鋼鐵"}, {"symbol": "2033", "name": "佳大", "industry": "鋼鐵"}, {"symbol": "2034", "name": "允強", "industry": "鋼鐵"}, {"symbol": "2038", "name": "海光", "industry": "鋼鐵"}, {"symbol": "2059", "name": "川湖", "industry": "鋼鐵"}, {"symbol": "2062", "name": "橋椿", "industry": "鋼鐵"}, {"symbol": "2069", "name": "運錩", "industry": "鋼鐵"}, {"symbol": "2072", "name": "世紀風電", "industry": "鋼鐵"}, {"symbol": "2101", "name": "南港", "industry": "汽車"}, {"symbol": "2102", "name": "泰豐", "industry": "汽車"}, {"symbol": "2103", "name": "台橡", "industry": "汽車"}, {"symbol": "2104", "name": "國際中橡", "industry": "汽車"}, {"symbol": "2105", "name": "正新", "industry": "汽車零件"}, {"symbol": "2106", "name": "建大", "industry": "汽車零件"}, {"symbol": "2107", "name": "厚生", "industry": "汽車"}, {"symbol": "2108", "name": "南帝", "industry": "汽車"}, {"symbol": "2109", "name": "華豐", "industry": "汽車"}, {"symbol": "2114", "name": "鑫永銓", "industry": "汽車"}, {"symbol": "2115", "name": "六暉-KY", "industry": "汽車"}, {"symbol": "2201", "name": "裕隆", "industry": "電子"}, {"symbol": "2204", "name": "中華", "industry": "電子"}, {"symbol": "2206", "name": "三陽工業", "industry": "電子"}, {"symbol": "2208", "name": "台船", "industry": "電子"}, {"symbol": "2211", "name": "長榮鋼", "industry": "鋼鐵"}, {"symbol": "2227", "name": "裕日車", "industry": "汽車"}, {"symbol": "2228", "name": "劍麟", "industry": "電子"}, {"symbol": "2231", "name": "為升", "industry": "電子"}, {"symbol": "2233", "name": "宇隆", "industry": "電子"}, {"symbol": "2236", "name": "百達-KY", "industry": "電子"}, {"symbol": "2239", "name": "英利-KY", "industry": "電子"}, {"symbol": "2241", "name": "艾姆勒", "industry": "電子"}, {"symbol": "2243", "name": "宏旭-KY", "industry": "電子"}, {"symbol": "2247", "name": "汎德永業", "industry": "電子"}, {"symbol": "2248", "name": "華勝-KY", "industry": "電子"}, {"symbol": "2250", "name": "IKKA-KY", "industry": "電子"}, {"symbol": "2254", "name": "巨鎧精密-創", "industry": "電子"}, {"symbol": "2258", "name": "鴻華先進-創", "industry": "電子"}, {"symbol": "2302", "name": "麗正", "industry": "半導體/電子"}, {"symbol": "2305", "name": "全友", "industry": "半導體/電子"}, {"symbol": "2312", "name": "金寶", "industry": "半導體/電子"}, {"symbol": "2313", "name": "華通", "industry": "半導體/電子"}, {"symbol": "2314", "name": "台揚", "industry": "半導體/電子"}, {"symbol": "2316", "name": "楠梓電", "industry": "半導體/電子"}, {"symbol": "2321", "name": "東訊", "industry": "半導體/電子"}, {"symbol": "2323", "name": "中環", "industry": "半導體/電子"}, {"symbol": "2328", "name": "廣宇", "industry": "半導體/電子"}, {"symbol": "2329", "name": "華泰", "industry": "半導體/電子"}, {"symbol": "2331", "name": "精英", "industry": "半導體/電子"}, {"symbol": "2332", "name": "友訊", "industry": "半導體/電子"}, {"symbol": "2337", "name": "旺宏", "industry": "半導體/電子"}, {"symbol": "2338", "name": "光罩", "industry": "半導體/電子"}, {"symbol": "2340", "name": "台亞", "industry": "半導體/電子"}, {"symbol": "2342", "name": "茂矽", "industry": "IC設計"}, {"symbol": "2347", "name": "聯強", "industry": "半導體/電子"}, {"symbol": "2348", "name": "海悅", "industry": "半導體/電子"}, {"symbol": "2349", "name": "錸德", "industry": "光電"}, {"symbol": "2351", "name": "順德", "industry": "IC封測"}, {"symbol": "2355", "name": "敬鵬", "industry": "半導體/電子"}, {"symbol": "2359", "name": "所羅門", "industry": "半導體/電子"}, {"symbol": "2360", "name": "致茂", "industry": "半導體/電子"}, {"symbol": "2362", "name": "藍天", "industry": "半導體/電子"}, {"symbol": "2363", "name": "矽統", "industry": "半導體/電子"}, {"symbol": "2364", "name": "倫飛", "industry": "半導體/電子"}, {"symbol": "2365", "name": "昆盈", "industry": "半導體/電子"}, {"symbol": "2367", "name": "燿華", "industry": "半導體/電子"}, {"symbol": "2368", "name": "金像電", "industry": "PCB"}, {"symbol": "2369", "name": "菱生", "industry": "半導體/電子"}, {"symbol": "2371", "name": "大同", "industry": "重電"}, {"symbol": "2373", "name": "震旦行", "industry": "半導體/電子"}, {"symbol": "2374", "name": "佳能", "industry": "半導體/電子"}, {"symbol": "2375", "name": "凱美", "industry": "半導體/電子"}, {"symbol": "2380", "name": "虹光", "industry": "半導體/電子"}, {"symbol": "2385", "name": "群光", "industry": "半導體/電子"}, {"symbol": "2387", "name": "精元", "industry": "半導體/電子"}, {"symbol": "2388", "name": "威盛", "industry": "IC設計"}, {"symbol": "2390", "name": "云辰", "industry": "半導體/電子"}, {"symbol": "2392", "name": "正崴", "industry": "半導體/電子"}, {"symbol": "2393", "name": "億光", "industry": "光電"}, {"symbol": "2397", "name": "友通", "industry": "半導體/電子"}, {"symbol": "2399", "name": "映泰", "industry": "半導體/電子"}, {"symbol": "2401", "name": "凌陽", "industry": "IC設計"}, {"symbol": "2402", "name": "毅嘉", "industry": "半導體/電子"}, {"symbol": "2404", "name": "漢唐", "industry": "半導體/電子"}, {"symbol": "2405", "name": "輔信", "industry": "半導體/電子"}, {"symbol": "2406", "name": "國碩", "industry": "半導體/電子"}, {"symbol": "2413", "name": "環科", "industry": "半導體/電子"}, {"symbol": "2414", "name": "精技", "industry": "半導體/電子"}, {"symbol": "2415", "name": "錩新", "industry": "半導體/電子"}, {"symbol": "2417", "name": "圓剛", "industry": "半導體/電子"}, {"symbol": "2419", "name": "仲琦", "industry": "半導體/電子"}, {"symbol": "2420", "name": "新巨", "industry": "半導體/電子"}, {"symbol": "2421", "name": "建準", "industry": "散熱"}, {"symbol": "2423", "name": "固緯", "industry": "半導體/電子"}, {"symbol": "2424", "name": "隴華", "industry": "半導體/電子"}, {"symbol": "2425", "name": "承啟", "industry": "半導體/電子"}, {"symbol": "2426", "name": "鼎元", "industry": "半導體/電子"}, {"symbol": "2427", "name": "三商電", "industry": "半導體/電子"}, {"symbol": "2428", "name": "興勤", "industry": "半導體/電子"}, {"symbol": "2429", "name": "銘旺科", "industry": "半導體/電子"}, {"symbol": "2430", "name": "燦坤", "industry": "半導體/電子"}, {"symbol": "2431", "name": "聯昌", "industry": "半導體/電子"}, {"symbol": "2432", "name": "倚天酷碁-創", "industry": "半導體/電子"}, {"symbol": "2433", "name": "互盛電", "industry": "半導體/電子"}, {"symbol": "2434", "name": "統懋", "industry": "半導體/電子"}, {"symbol": "2436", "name": "偉詮電", "industry": "電源管理"}, {"symbol": "2438", "name": "翔耀", "industry": "被動元件"}, {"symbol": "2439", "name": "美律", "industry": "半導體/電子"}, {"symbol": "2440", "name": "太空梭", "industry": "半導體/電子"}, {"symbol": "2441", "name": "超豐", "industry": "IC封測"}, {"symbol": "2442", "name": "新美齊", "industry": "半導體/電子"}, {"symbol": "2444", "name": "兆勁", "industry": "半導體/電子"}, {"symbol": "2449", "name": "京元電子", "industry": "半導體/電子"}, {"symbol": "2450", "name": "神腦", "industry": "半導體/電子"}, {"symbol": "2451", "name": "創見", "industry": "半導體/電子"}, {"symbol": "2453", "name": "凌群", "industry": "半導體/電子"}, {"symbol": "2455", "name": "全新", "industry": "半導體/電子"}, {"symbol": "2457", "name": "飛宏", "industry": "半導體/電子"}, {"symbol": "2458", "name": "義隆", "industry": "IC封測"}, {"symbol": "2459", "name": "敦吉", "industry": "半導體/電子"}, {"symbol": "2460", "name": "建通", "industry": "半導體/電子"}, {"symbol": "2461", "name": "光群雷", "industry": "半導體/電子"}, {"symbol": "2462", "name": "良得電", "industry": "半導體/電子"}, {"symbol": "2464", "name": "盟立", "industry": "半導體/電子"}, {"symbol": "2465", "name": "麗臺", "industry": "半導體/電子"}, {"symbol": "2466", "name": "冠西電", "industry": "半導體/電子"}, {"symbol": "2467", "name": "志聖", "industry": "半導體/電子"}, {"symbol": "2468", "name": "華經", "industry": "半導體/電子"}, {"symbol": "2471", "name": "資通", "industry": "半導體/電子"}, {"symbol": "2472", "name": "立隆電", "industry": "被動元件"}, {"symbol": "2476", "name": "鉅祥", "industry": "半導體/電子"}, {"symbol": "2477", "name": "美隆電", "industry": "半導體/電子"}, {"symbol": "2478", "name": "大毅", "industry": "半導體/電子"}, {"symbol": "2480", "name": "敦陽科", "industry": "IC封測"}, {"symbol": "2481", "name": "強茂", "industry": "半導體/電子"}, {"symbol": "2482", "name": "連宇", "industry": "半導體/電子"}, {"symbol": "2483", "name": "百容", "industry": "半導體/電子"}, {"symbol": "2484", "name": "希華", "industry": "半導體/電子"}, {"symbol": "2485", "name": "兆赫", "industry": "半導體/電子"}, {"symbol": "2486", "name": "一詮", "industry": "半導體/電子"}, {"symbol": "2488", "name": "漢平", "industry": "半導體/電子"}, {"symbol": "2489", "name": "瑞軒", "industry": "面板"}, {"symbol": "2491", "name": "吉祥全", "industry": "半導體/電子"}, {"symbol": "2492", "name": "華新科", "industry": "PCB"}, {"symbol": "2493", "name": "揚博", "industry": "半導體/電子"}, {"symbol": "2495", "name": "普安", "industry": "半導體/電子"}, {"symbol": "2496", "name": "卓越", "industry": "半導體/電子"}, {"symbol": "2497", "name": "怡利電", "industry": "半導體/電子"}, {"symbol": "2498", "name": "宏達電", "industry": "半導體/電子"}, {"symbol": "2501", "name": "國建", "industry": "營建"}, {"symbol": "2504", "name": "國產", "industry": "營建"}, {"symbol": "2505", "name": "國揚", "industry": "營建"}, {"symbol": "2506", "name": "太設", "industry": "營建"}, {"symbol": "2509", "name": "全坤建", "industry": "營建"}, {"symbol": "2511", "name": "太子", "industry": "營建"}, {"symbol": "2514", "name": "龍邦", "industry": "營建"}, {"symbol": "2515", "name": "中工", "industry": "營建"}, {"symbol": "2516", "name": "新建", "industry": "營建"}, {"symbol": "2520", "name": "冠德", "industry": "營建"}, {"symbol": "2524", "name": "京城", "industry": "營建"}, {"symbol": "2527", "name": "宏璟", "industry": "營建"}, {"symbol": "2528", "name": "皇普", "industry": "營建"}, {"symbol": "2530", "name": "華建", "industry": "營建"}, {"symbol": "2534", "name": "宏盛", "industry": "營建"}, {"symbol": "2535", "name": "達欣工", "industry": "營建"}, {"symbol": "2536", "name": "宏普", "industry": "營建"}, {"symbol": "2537", "name": "聯上發", "industry": "營建"}, {"symbol": "2538", "name": "基泰", "industry": "營建"}, {"symbol": "2539", "name": "櫻花建", "industry": "營建"}, {"symbol": "2540", "name": "愛山林", "industry": "營建"}, {"symbol": "2542", "name": "興富發", "industry": "營建"}, {"symbol": "2543", "name": "皇昌", "industry": "營建"}, {"symbol": "2545", "name": "皇翔", "industry": "營建"}, {"symbol": "2546", "name": "根基", "industry": "營建"}, {"symbol": "2547", "name": "日勝生", "industry": "營建"}, {"symbol": "2548", "name": "華固", "industry": "營建"}, {"symbol": "2597", "name": "潤弘", "industry": "營建"}, {"symbol": "2601", "name": "益航", "industry": "航運"}, {"symbol": "2605", "name": "新興", "industry": "航運"}, {"symbol": "2606", "name": "裕民", "industry": "航運"}, {"symbol": "2607", "name": "榮運", "industry": "航運"}, {"symbol": "2608", "name": "嘉里大榮", "industry": "航運"}, {"symbol": "2610", "name": "華航", "industry": "航運"}, {"symbol": "2611", "name": "志信", "industry": "航運"}, {"symbol": "2612", "name": "中航", "industry": "航運"}, {"symbol": "2613", "name": "中櫃", "industry": "航運"}, {"symbol": "2614", "name": "東森", "industry": "航運"}, {"symbol": "2616", "name": "山隆", "industry": "航運"}, {"symbol": "2617", "name": "台航", "industry": "航運"}, {"symbol": "2618", "name": "長榮航", "industry": "航運"}, {"symbol": "2630", "name": "亞航", "industry": "航運"}, {"symbol": "2633", "name": "台灣高鐵", "industry": "航運"}, {"symbol": "2634", "name": "漢翔", "industry": "航運"}, {"symbol": "2636", "name": "台驊控股", "industry": "航運"}, {"symbol": "2637", "name": "慧洋-KY", "industry": "航運"}, {"symbol": "2642", "name": "宅配通", "industry": "航運"}, {"symbol": "2645", "name": "長榮航太", "industry": "航運"}, {"symbol": "2646", "name": "星宇航空", "industry": "航運"}, {"symbol": "2701", "name": "萬企", "industry": "飯店/觀光"}, {"symbol": "2702", "name": "華園", "industry": "飯店/觀光"}, {"symbol": "2704", "name": "國賓", "industry": "飯店/觀光"}, {"symbol": "2705", "name": "六福", "industry": "飯店/觀光"}, {"symbol": "2706", "name": "第一店", "industry": "飯店/觀光"}, {"symbol": "2707", "name": "晶華", "industry": "飯店/觀光"}, {"symbol": "2712", "name": "遠雄來", "industry": "飯店/觀光"}, {"symbol": "2722", "name": "夏都", "industry": "飯店/觀光"}, {"symbol": "2723", "name": "美食-KY", "industry": "飯店/觀光"}, {"symbol": "2727", "name": "王品", "industry": "餐飲"}, {"symbol": "2731", "name": "雄獅", "industry": "飯店/觀光"}, {"symbol": "2739", "name": "寒舍", "industry": "飯店/觀光"}, {"symbol": "2748", "name": "雲品", "industry": "飯店/觀光"}, {"symbol": "2753", "name": "八方雲集", "industry": "飯店/觀光"}, {"symbol": "2762", "name": "世界健身-KY", "industry": "飯店/觀光"}, {"symbol": "2812", "name": "台中銀", "industry": "金融"}, {"symbol": "2816", "name": "旺旺保", "industry": "金融"}, {"symbol": "2820", "name": "華票", "industry": "金融"}, {"symbol": "2832", "name": "台產", "industry": "金融"}, {"symbol": "2834", "name": "臺企銀", "industry": "金融"}, {"symbol": "2836", "name": "高雄銀", "industry": "金融"}, {"symbol": "2838", "name": "聯邦銀", "industry": "金融"}, {"symbol": "2845", "name": "遠東銀", "industry": "金融"}, {"symbol": "2849", "name": "安泰銀", "industry": "金融"}, {"symbol": "2850", "name": "新產", "industry": "金融"}, {"symbol": "2851", "name": "中再保", "industry": "金融"}, {"symbol": "2852", "name": "第一保", "industry": "金融"}, {"symbol": "2855", "name": "統一證", "industry": "金融"}, {"symbol": "2867", "name": "三商壽", "industry": "金融"}, {"symbol": "2889", "name": "國票金", "industry": "金融"}, {"symbol": "2897", "name": "王道銀行", "industry": "金融"}, {"symbol": "2901", "name": "欣欣", "industry": "零售"}, {"symbol": "2903", "name": "遠百", "industry": "零售"}, {"symbol": "2904", "name": "匯僑", "industry": "零售"}, {"symbol": "2905", "name": "三商", "industry": "零售"}, {"symbol": "2906", "name": "高林", "industry": "零售"}, {"symbol": "2908", "name": "特力", "industry": "零售"}, {"symbol": "2910", "name": "統領", "industry": "零售"}, {"symbol": "2911", "name": "麗嬰房", "industry": "零售"}, {"symbol": "2913", "name": "農林", "industry": "零售"}, {"symbol": "2915", "name": "潤泰全", "industry": "零售"}, {"symbol": "2923", "name": "鼎固-KY", "industry": "零售"}, {"symbol": "2929", "name": "淘帝-KY", "industry": "零售"}, {"symbol": "2939", "name": "永邑-KY", "industry": "零售"}, {"symbol": "2945", "name": "三商家購", "industry": "零售"}, {"symbol": "3002", "name": "歐格", "industry": "電子"}, {"symbol": "3003", "name": "健和興", "industry": "電子"}, {"symbol": "3004", "name": "豐達科", "industry": "半導體材料"}, {"symbol": "3005", "name": "神基", "industry": "電子"}, {"symbol": "3006", "name": "晶豪科", "industry": "電子"}, {"symbol": "3010", "name": "華立", "industry": "電子"}, {"symbol": "3011", "name": "今皓", "industry": "電子"}, {"symbol": "3013", "name": "晟銘電", "industry": "電子"}, {"symbol": "3014", "name": "聯陽", "industry": "電子"}, {"symbol": "3015", "name": "全漢", "industry": "電子"}, {"symbol": "3016", "name": "嘉晶", "industry": "電子"}, {"symbol": "3018", "name": "隆銘綠能", "industry": "綠能"}, {"symbol": "3019", "name": "亞光", "industry": "電子"}, {"symbol": "3021", "name": "鴻名", "industry": "電子"}, {"symbol": "3022", "name": "威強電", "industry": "電子"}, {"symbol": "3023", "name": "信邦", "industry": "電子"}, {"symbol": "3024", "name": "憶聲", "industry": "電子"}, {"symbol": "3025", "name": "星通", "industry": "電子"}, {"symbol": "3026", "name": "禾伸堂", "industry": "電子"}, {"symbol": "3027", "name": "盛達", "industry": "電子"}, {"symbol": "3028", "name": "增你強", "industry": "電子"}, {"symbol": "3029", "name": "零壹", "industry": "電子"}, {"symbol": "3030", "name": "德律", "industry": "電子"}, {"symbol": "3031", "name": "佰鴻", "industry": "電子"}, {"symbol": "3032", "name": "偉訓", "industry": "電子"}, {"symbol": "3033", "name": "威健", "industry": "電子"}, {"symbol": "3038", "name": "全台", "industry": "電子"}, {"symbol": "3040", "name": "遠見", "industry": "電子"}, {"symbol": "3041", "name": "揚智", "industry": "電子"}, {"symbol": "3042", "name": "晶技", "industry": "電子"}, {"symbol": "3043", "name": "科風", "industry": "電子"}, {"symbol": "3044", "name": "健鼎", "industry": "光電"}, {"symbol": "3046", "name": "建碁", "industry": "電子"}, {"symbol": "3047", "name": "訊舟", "industry": "電子"}, {"symbol": "3048", "name": "益登", "industry": "電子"}, {"symbol": "3049", "name": "精金", "industry": "電子"}, {"symbol": "3050", "name": "鈺德", "industry": "電子"}, {"symbol": "3051", "name": "力特", "industry": "電子"}, {"symbol": "3052", "name": "夆典", "industry": "電子"}, {"symbol": "3054", "name": "立萬利", "industry": "電子"}, {"symbol": "3055", "name": "蔚華科", "industry": "電子"}, {"symbol": "3056", "name": "富華新", "industry": "電子"}, {"symbol": "3057", "name": "喬鼎", "industry": "電子"}, {"symbol": "3058", "name": "立德", "industry": "電子"}, {"symbol": "3059", "name": "華晶科", "industry": "電子"}, {"symbol": "3060", "name": "銘異", "industry": "電子"}, {"symbol": "3062", "name": "建漢", "industry": "電子"}, {"symbol": "3090", "name": "日電貿", "industry": "電子"}, {"symbol": "3092", "name": "鴻碩", "industry": "電子"}, {"symbol": "3094", "name": "聯傑", "industry": "光纖/網通"}, {"symbol": "3130", "name": "一零四", "industry": "電子"}, {"symbol": "3135", "name": "凌航", "industry": "電子"}, {"symbol": "3138", "name": "耀登", "industry": "電子"}, {"symbol": "3149", "name": "正達", "industry": "電子"}, {"symbol": "3150", "name": "鈺寶-創", "industry": "電子"}, {"symbol": "3164", "name": "景岳", "industry": "電子"}, {"symbol": "3167", "name": "大量", "industry": "電子"}, {"symbol": "3168", "name": "眾福科", "industry": "電子"}, {"symbol": "3189", "name": "景碩", "industry": "PCB"}, {"symbol": "3209", "name": "全科", "industry": "電子"}, {"symbol": "3229", "name": "晟鈦", "industry": "電子"}, {"symbol": "3257", "name": "虹冠電", "industry": "IC設計"}, {"symbol": "3266", "name": "昇陽", "industry": "電子"}, {"symbol": "3296", "name": "勝德", "industry": "電子"}, {"symbol": "3305", "name": "昇貿", "industry": "電子"}, {"symbol": "3308", "name": "聯德", "industry": "IC設計"}, {"symbol": "3312", "name": "弘憶股", "industry": "電子"}, {"symbol": "3321", "name": "同泰", "industry": "電子"}, {"symbol": "3338", "name": "泰碩", "industry": "電子"}, {"symbol": "3346", "name": "麗清", "industry": "電子"}, {"symbol": "3356", "name": "奇偶", "industry": "電子"}, {"symbol": "3376", "name": "新日興", "industry": "電子"}, {"symbol": "3380", "name": "明泰", "industry": "電子"}, {"symbol": "3406", "name": "玉晶光", "industry": "電子"}, {"symbol": "3413", "name": "京鼎", "industry": "電子"}, {"symbol": "3416", "name": "融程電", "industry": "電子"}, {"symbol": "3419", "name": "譁裕", "industry": "電子"}, {"symbol": "3432", "name": "台端", "industry": "電子"}, {"symbol": "3437", "name": "榮創", "industry": "電子"}, {"symbol": "3447", "name": "展達", "industry": "電子"}, {"symbol": "3450", "name": "聯鈞", "industry": "半導體材料"}, {"symbol": "3494", "name": "誠研", "industry": "電子"}, {"symbol": "3501", "name": "維熹", "industry": "電子"}, {"symbol": "3504", "name": "揚明光", "industry": "電子"}, {"symbol": "3515", "name": "華擎", "industry": "電子"}, {"symbol": "3518", "name": "柏騰", "industry": "電子"}, {"symbol": "3528", "name": "安馳", "industry": "電子"}, {"symbol": "3530", "name": "晶相光", "industry": "電子"}, {"symbol": "3532", "name": "台勝科", "industry": "IC設計"}, {"symbol": "3533", "name": "嘉澤", "industry": "電子"}, {"symbol": "3535", "name": "晶彩科", "industry": "電子"}, {"symbol": "3543", "name": "州巧", "industry": "電子"}, {"symbol": "3550", "name": "聯穎", "industry": "電子"}, {"symbol": "3557", "name": "嘉威", "industry": "電子"}, {"symbol": "3576", "name": "聯合再生", "industry": "電子"}, {"symbol": "3583", "name": "辛耘", "industry": "電子"}, {"symbol": "3588", "name": "通嘉", "industry": "電源管理"}, {"symbol": "3591", "name": "艾笛森", "industry": "電子"}, {"symbol": "3592", "name": "瑞鼎", "industry": "電子"}, {"symbol": "3593", "name": "力銘", "industry": "電子"}, {"symbol": "3596", "name": "智易", "industry": "電子"}, {"symbol": "3605", "name": "宏致", "industry": "電子"}, {"symbol": "3607", "name": "谷崧", "industry": "電子"}, {"symbol": "3617", "name": "碩天", "industry": "電子"}, {"symbol": "3622", "name": "洋華", "industry": "電子"}, {"symbol": "3645", "name": "達邁", "industry": "電子"}, {"symbol": "3652", "name": "精聯", "industry": "電子"}, {"symbol": "3665", "name": "貿聯-KY", "industry": "電子"}, {"symbol": "3669", "name": "圓展", "industry": "電子"}, {"symbol": "3673", "name": "TPK-KY", "industry": "電子"}, {"symbol": "3679", "name": "新至陞", "industry": "電子"}, {"symbol": "3686", "name": "達能", "industry": "電子"}, {"symbol": "3694", "name": "海華", "industry": "電子"}, {"symbol": "3701", "name": "大眾控", "industry": "電子"}, {"symbol": "3702", "name": "大聯大", "industry": "電子"}, {"symbol": "3703", "name": "欣陸", "industry": "電子"}, {"symbol": "3704", "name": "合勤控", "industry": "電子"}, {"symbol": "3705", "name": "永信", "industry": "電子"}, {"symbol": "3706", "name": "神達", "industry": "電子"}, {"symbol": "3708", "name": "上緯投控", "industry": "電子"}, {"symbol": "3712", "name": "永崴投控", "industry": "電子"}, {"symbol": "3714", "name": "富采", "industry": "IC設計"}, {"symbol": "3715", "name": "定穎投控", "industry": "電子"}, {"symbol": "3716", "name": "中化控股", "industry": "電子"}, {"symbol": "3717", "name": "聯嘉投控", "industry": "電子"}, {"symbol": "4104", "name": "佳醫", "industry": "生技"}, {"symbol": "4106", "name": "雃博", "industry": "生技"}, {"symbol": "4108", "name": "懷特", "industry": "生技"}, {"symbol": "4119", "name": "旭富", "industry": "生技"}, {"symbol": "4133", "name": "亞諾法", "industry": "生技"}, {"symbol": "4137", "name": "麗豐-KY", "industry": "生技"}, {"symbol": "4142", "name": "國光生", "industry": "生技"}, {"symbol": "4148", "name": "全宇生技-KY", "industry": "生技"}, {"symbol": "4155", "name": "訊映", "industry": "生技"}, {"symbol": "4164", "name": "承業醫", "industry": "生技"}, {"symbol": "4169", "name": "泰宗", "industry": "生技"}, {"symbol": "4178", "name": "永笙-KY", "industry": "生技"}, {"symbol": "4190", "name": "佐登-KY", "industry": "生技"}, {"symbol": "4195", "name": "基米-創", "industry": "生技"}, {"symbol": "4306", "name": "炎洲", "industry": "其他"}, {"symbol": "4414", "name": "如興", "industry": "其他"}, {"symbol": "4426", "name": "利勤", "industry": "其他"}, {"symbol": "4438", "name": "廣越", "industry": "其他"}, {"symbol": "4439", "name": "冠星-KY", "industry": "其他"}, {"symbol": "4440", "name": "宜新實業", "industry": "其他"}, {"symbol": "4441", "name": "振大環球", "industry": "其他"}, {"symbol": "4526", "name": "東台", "industry": "散熱"}, {"symbol": "4532", "name": "瑞智", "industry": "其他"}, {"symbol": "4536", "name": "拓凱", "industry": "其他"}, {"symbol": "4540", "name": "全球傳動", "industry": "其他"}, {"symbol": "4545", "name": "銘鈺", "industry": "其他"}, {"symbol": "4551", "name": "智伸科", "industry": "其他"}, {"symbol": "4552", "name": "力達-KY", "industry": "其他"}, {"symbol": "4555", "name": "氣立", "industry": "其他"}, {"symbol": "4557", "name": "永新-KY", "industry": "其他"}, {"symbol": "4560", "name": "強信-KY", "industry": "其他"}, {"symbol": "4562", "name": "穎漢", "industry": "其他"}, {"symbol": "4564", "name": "元翎", "industry": "其他"}, {"symbol": "4566", "name": "時碩工業", "industry": "其他"}, {"symbol": "4569", "name": "六方科-KY", "industry": "其他"}, {"symbol": "4571", "name": "鈞興-KY", "industry": "其他"}, {"symbol": "4572", "name": "駐龍", "industry": "其他"}, {"symbol": "4576", "name": "大銀微系統", "industry": "其他"}, {"symbol": "4581", "name": "光隆精密-KY", "industry": "其他"}, {"symbol": "4583", "name": "台灣精銳", "industry": "其他"}, {"symbol": "4585", "name": "達明", "industry": "其他"}, {"symbol": "4588", "name": "玖鼎電力", "industry": "重電"}, {"symbol": "4590", "name": "富田-創", "industry": "其他"}, {"symbol": "4720", "name": "德淵", "industry": "其他"}, {"symbol": "4722", "name": "國精化", "industry": "其他"}, {"symbol": "4736", "name": "泰博", "industry": "其他"}, {"symbol": "4737", "name": "華廣", "industry": "其他"}, {"symbol": "4739", "name": "康普", "industry": "PCB"}, {"symbol": "4746", "name": "台耀", "industry": "其他"}, {"symbol": "4755", "name": "三福化", "industry": "其他"}, {"symbol": "4763", "name": "材料*-KY", "industry": "其他"}, {"symbol": "4764", "name": "雙鍵", "industry": "其他"}, {"symbol": "4766", "name": "南寶", "industry": "其他"}, {"symbol": "4770", "name": "上品", "industry": "其他"}, {"symbol": "4771", "name": "望隼", "industry": "其他"}, {"symbol": "4807", "name": "日成-KY", "industry": "其他"}, {"symbol": "4906", "name": "正文", "industry": "電信"}, {"symbol": "4912", "name": "聯德控股-KY", "industry": "電信"}, {"symbol": "4915", "name": "致伸", "industry": "電信"}, {"symbol": "4916", "name": "事欣科", "industry": "電信"}, {"symbol": "4919", "name": "新唐", "industry": "IC設計"}, {"symbol": "4927", "name": "泰鼎-KY", "industry": "IC設計"}, {"symbol": "4930", "name": "燦星網", "industry": "電信"}, {"symbol": "4934", "name": "太極", "industry": "電信"}, {"symbol": "4935", "name": "茂林-KY", "industry": "電信"}, {"symbol": "4942", "name": "嘉彰", "industry": "電信"}, {"symbol": "4943", "name": "康控-KY", "industry": "電信"}, {"symbol": "4949", "name": "有成精密", "industry": "電信"}, {"symbol": "4952", "name": "凌通", "industry": "電源管理"}, {"symbol": "4956", "name": "光鋐", "industry": "PCB"}, {"symbol": "4958", "name": "臻鼎-KY", "industry": "電信"}, {"symbol": "4960", "name": "誠美材", "industry": "電信"}, {"symbol": "4961", "name": "天鈺", "industry": "IC設計"}, {"symbol": "4967", "name": "十銓", "industry": "電信"}, {"symbol": "4968", "name": "立積", "industry": "電信"}, {"symbol": "4976", "name": "佳凌", "industry": "電信"}, {"symbol": "4977", "name": "眾達-KY", "industry": "晶圓代工"}, {"symbol": "4989", "name": "榮科", "industry": "電信"}, {"symbol": "4994", "name": "傳奇", "industry": "電信"}, {"symbol": "4999", "name": "鑫禾", "industry": "電信"}, {"symbol": "5007", "name": "三星", "industry": "其他"}, {"symbol": "5203", "name": "訊連", "industry": "軟體"}, {"symbol": "5215", "name": "科嘉-KY", "industry": "軟體"}, {"symbol": "5222", "name": "全訊", "industry": "軟體"}, {"symbol": "5225", "name": "東科-KY", "industry": "軟體"}, {"symbol": "5234", "name": "達興材料", "industry": "光纖/網通"}, {"symbol": "5243", "name": "乙盛-KY", "industry": "軟體"}, {"symbol": "5244", "name": "弘凱", "industry": "軟體"}, {"symbol": "5258", "name": "虹堡", "industry": "軟體"}, {"symbol": "5283", "name": "禾聯碩", "industry": "軟體"}, {"symbol": "5284", "name": "jpp-KY", "industry": "軟體"}, {"symbol": "5285", "name": "界霖", "industry": "軟體"}, {"symbol": "5288", "name": "豐祥-KY", "industry": "軟體"}, {"symbol": "5292", "name": "華懋", "industry": "軟體"}, {"symbol": "5306", "name": "桂盟", "industry": "其他"}, {"symbol": "5388", "name": "中磊", "industry": "其他"}, {"symbol": "5434", "name": "崇越", "industry": "其他"}, {"symbol": "5469", "name": "瀚宇博", "industry": "其他"}, {"symbol": "5471", "name": "松翰", "industry": "其他"}, {"symbol": "5484", "name": "慧友", "industry": "其他"}, {"symbol": "5515", "name": "建國", "industry": "其他"}, {"symbol": "5519", "name": "隆大", "industry": "其他"}, {"symbol": "5521", "name": "工信", "industry": "其他"}, {"symbol": "5522", "name": "遠雄", "industry": "其他"}, {"symbol": "5525", "name": "順天", "industry": "其他"}, {"symbol": "5531", "name": "鄉林", "industry": "其他"}, {"symbol": "5533", "name": "皇鼎", "industry": "其他"}, {"symbol": "5534", "name": "長虹", "industry": "其他"}, {"symbol": "5538", "name": "東明-KY", "industry": "其他"}, {"symbol": "5546", "name": "永固-KY", "industry": "其他"}, {"symbol": "5607", "name": "遠雄港", "industry": "其他"}, {"symbol": "5608", "name": "四維航", "industry": "航運"}, {"symbol": "5706", "name": "鳳凰", "industry": "其他"}, {"symbol": "5876", "name": "上海商銀", "industry": "金融"}, {"symbol": "5906", "name": "台南-KY", "industry": "零售"}, {"symbol": "5907", "name": "大洋-KY", "industry": "零售"}, {"symbol": "6005", "name": "群益證", "industry": "金融"}, {"symbol": "6024", "name": "群益期", "industry": "金融"}, {"symbol": "6108", "name": "競國", "industry": "電子"}, {"symbol": "6112", "name": "邁達特", "industry": "電子"}, {"symbol": "6115", "name": "鎰勝", "industry": "電子"}, {"symbol": "6116", "name": "彩晶", "industry": "面板"}, {"symbol": "6117", "name": "迎廣", "industry": "電子"}, {"symbol": "6120", "name": "達運", "industry": "電子"}, {"symbol": "6128", "name": "上福", "industry": "電子"}, {"symbol": "6133", "name": "金橋", "industry": "電子"}, {"symbol": "6136", "name": "富爾特", "industry": "電子"}, {"symbol": "6139", "name": "亞翔", "industry": "電子"}, {"symbol": "6141", "name": "柏承", "industry": "電子"}, {"symbol": "6142", "name": "友勁", "industry": "電子"}, {"symbol": "6152", "name": "百一", "industry": "電子"}, {"symbol": "6153", "name": "嘉聯益", "industry": "電子"}, {"symbol": "6155", "name": "鈞寶", "industry": "電子"}, {"symbol": "6164", "name": "華興", "industry": "電子"}, {"symbol": "6165", "name": "浪凡", "industry": "電子"}, {"symbol": "6166", "name": "凌華", "industry": "電子"}, {"symbol": "6168", "name": "宏齊", "industry": "電子"}, {"symbol": "6176", "name": "瑞儀", "industry": "電子"}, {"symbol": "6177", "name": "達麗", "industry": "電子"}, {"symbol": "6183", "name": "關貿", "industry": "PCB"}, {"symbol": "6184", "name": "大豐電", "industry": "電子"}, {"symbol": "6189", "name": "豐藝", "industry": "電子"}, {"symbol": "6191", "name": "精成科", "industry": "電子"}, {"symbol": "6192", "name": "巨路", "industry": "電子"}, {"symbol": "6196", "name": "帆宣", "industry": "電子"}, {"symbol": "6197", "name": "佳必琪", "industry": "電子"}, {"symbol": "6201", "name": "亞弘電", "industry": "電子"}, {"symbol": "6202", "name": "盛群", "industry": "電子"}, {"symbol": "6205", "name": "詮欣", "industry": "電子"}, {"symbol": "6206", "name": "飛捷", "industry": "電子"}, {"symbol": "6209", "name": "今國光", "industry": "電子"}, {"symbol": "6213", "name": "聯茂", "industry": "PCB"}, {"symbol": "6214", "name": "精誠", "industry": "電子"}, {"symbol": "6215", "name": "和椿", "industry": "電子"}, {"symbol": "6216", "name": "居易", "industry": "電子"}, {"symbol": "6224", "name": "聚鼎", "industry": "電子"}, {"symbol": "6225", "name": "天瀚", "industry": "電子"}, {"symbol": "6226", "name": "光鼎", "industry": "電子"}, {"symbol": "6230", "name": "尼得科超眾", "industry": "散熱"}, {"symbol": "6235", "name": "華孚", "industry": "電子"}, {"symbol": "6239", "name": "力成", "industry": "電子"}, {"symbol": "6243", "name": "迅杰", "industry": "電子"}, {"symbol": "6257", "name": "矽格", "industry": "電子"}, {"symbol": "6269", "name": "台郡", "industry": "電子"}, {"symbol": "6271", "name": "同欣電", "industry": "電子"}, {"symbol": "6272", "name": "驊陞", "industry": "電子"}, {"symbol": "6277", "name": "宏正", "industry": "電子"}, {"symbol": "6278", "name": "台表科", "industry": "IC設計"}, {"symbol": "6281", "name": "全國電", "industry": "電子"}, {"symbol": "6282", "name": "康舒", "industry": "電子"}, {"symbol": "6283", "name": "淳安", "industry": "電子"}, {"symbol": "6285", "name": "啟碁", "industry": "網通"}, {"symbol": "6405", "name": "悅城", "industry": "電子"}, {"symbol": "6409", "name": "旭隼", "industry": "電子"}, {"symbol": "6412", "name": "群電", "industry": "電子"}, {"symbol": "6414", "name": "樺漢", "industry": "電子"}, {"symbol": "6416", "name": "瑞祺電通", "industry": "電子"}, {"symbol": "6426", "name": "統新", "industry": "電子"}, {"symbol": "6431", "name": "光麗-KY", "industry": "電子"}, {"symbol": "6438", "name": "迅得", "industry": "電子"}, {"symbol": "6442", "name": "光聖", "industry": "電子"}, {"symbol": "6443", "name": "元晶", "industry": "電子"}, {"symbol": "6449", "name": "鈺邦", "industry": "電子"}, {"symbol": "6451", "name": "訊芯-KY", "industry": "電子"}, {"symbol": "6456", "name": "GIS-KY", "industry": "電子"}, {"symbol": "6464", "name": "台數科", "industry": "電子"}, {"symbol": "6472", "name": "保瑞", "industry": "電子"}, {"symbol": "6477", "name": "安集", "industry": "電子"}, {"symbol": "6491", "name": "晶碩", "industry": "電子"}, {"symbol": "6504", "name": "南六", "industry": "石化"}, {"symbol": "6505", "name": "台塑化", "industry": "石化"}, {"symbol": "6515", "name": "穎崴", "industry": "晶圓代工"}, {"symbol": "6525", "name": "捷敏-KY", "industry": "石化"}, {"symbol": "6526", "name": "達發", "industry": "石化"}, {"symbol": "6531", "name": "愛普*", "industry": "IC設計"}, {"symbol": "6533", "name": "晶心科", "industry": "石化"}, {"symbol": "6534", "name": "正瀚-創", "industry": "石化"}, {"symbol": "6541", "name": "泰福-KY", "industry": "石化"}, {"symbol": "6550", "name": "北極星藥業-KY", "industry": "生技"}, {"symbol": "6552", "name": "易華電", "industry": "石化"}, {"symbol": "6558", "name": "興能高", "industry": "石化"}, {"symbol": "6573", "name": "虹揚-KY", "industry": "石化"}, {"symbol": "6579", "name": "研揚", "industry": "石化"}, {"symbol": "6581", "name": "鋼聯", "industry": "鋼鐵"}, {"symbol": "6582", "name": "申豐", "industry": "石化"}, {"symbol": "6585", "name": "鼎基", "industry": "石化"}, {"symbol": "6589", "name": "台康生技", "industry": "生技"}, {"symbol": "6591", "name": "動力-KY", "industry": "石化"}, {"symbol": "6592", "name": "和潤企業", "industry": "石化"}, {"symbol": "6598", "name": "ABC-KY", "industry": "石化"}, {"symbol": "6605", "name": "帝寶", "industry": "電子"}, {"symbol": "6606", "name": "建德工業", "industry": "電子"}, {"symbol": "6614", "name": "資拓宏宇", "industry": "電子"}, {"symbol": "6625", "name": "必應", "industry": "電子"}, {"symbol": "6641", "name": "基士德-KY", "industry": "電子"}, {"symbol": "6645", "name": "金萬林-創", "industry": "電子"}, {"symbol": "6655", "name": "科定", "industry": "電子"}, {"symbol": "6657", "name": "華安", "industry": "電子"}, {"symbol": "6658", "name": "聯策", "industry": "電子"}, {"symbol": "6666", "name": "羅麗芬-KY", "industry": "電子"}, {"symbol": "6668", "name": "中揚光", "industry": "電子"}, {"symbol": "6671", "name": "三能-KY", "industry": "電子"}, {"symbol": "6672", "name": "騰輝電子-KY", "industry": "電子"}, {"symbol": "6674", "name": "鋐寶科技", "industry": "電子"}, {"symbol": "6689", "name": "伊雲谷", "industry": "電子"}, {"symbol": "6691", "name": "洋基工程", "industry": "電子"}, {"symbol": "6695", "name": "芯鼎", "industry": "電子"}, {"symbol": "6698", "name": "旭暉應材", "industry": "電子"}, {"symbol": "6706", "name": "惠特", "industry": "電子"}, {"symbol": "6715", "name": "嘉基", "industry": "電子"}, {"symbol": "6719", "name": "力智", "industry": "電子"}, {"symbol": "6722", "name": "輝創", "industry": "電子"}, {"symbol": "6742", "name": "澤米", "industry": "電子"}, {"symbol": "6743", "name": "安普新", "industry": "電子"}, {"symbol": "6753", "name": "龍德造船", "industry": "電子"}, {"symbol": "6754", "name": "匯僑設計", "industry": "電子"}, {"symbol": "6756", "name": "威鋒電子", "industry": "電子"}, {"symbol": "6757", "name": "台灣虎航", "industry": "電子"}, {"symbol": "6768", "name": "志強-KY", "industry": "電子"}, {"symbol": "6770", "name": "力積電", "industry": "伺服器"}, {"symbol": "6771", "name": "平和環保-創", "industry": "電子"}, {"symbol": "6776", "name": "展碁國際", "industry": "電子"}, {"symbol": "6781", "name": "AES-KY", "industry": "電子"}, {"symbol": "6782", "name": "視陽", "industry": "電子"}, {"symbol": "6789", "name": "采鈺", "industry": "電子"}, {"symbol": "6790", "name": "永豐實", "industry": "電子"}, {"symbol": "6792", "name": "詠業", "industry": "電子"}, {"symbol": "6794", "name": "向榮生技", "industry": "生技"}, {"symbol": "6796", "name": "晉弘", "industry": "電子"}, {"symbol": "6799", "name": "來頡", "industry": "電子"}, {"symbol": "6805", "name": "富世達", "industry": "電子"}, {"symbol": "6806", "name": "森崴能源", "industry": "電子"}, {"symbol": "6807", "name": "峰源-KY", "industry": "電子"}, {"symbol": "6830", "name": "汎銓", "industry": "電子"}, {"symbol": "6831", "name": "邁科", "industry": "電子"}, {"symbol": "6834", "name": "天二科技", "industry": "電子"}, {"symbol": "6835", "name": "圓裕", "industry": "電子"}, {"symbol": "6838", "name": "台新藥", "industry": "生技"}, {"symbol": "6854", "name": "錼創科技-KY創", "industry": "電子"}, {"symbol": "6861", "name": "睿生光電", "industry": "電子"}, {"symbol": "6862", "name": "三集瑞-KY", "industry": "電子"}, {"symbol": "6863", "name": "永道-KY", "industry": "電子"}, {"symbol": "6869", "name": "雲豹能源", "industry": "電子"}, {"symbol": "6873", "name": "泓德能源", "industry": "電子"}, {"symbol": "6885", "name": "全福生技", "industry": "生技"}, {"symbol": "6887", "name": "寶綠特-KY", "industry": "電子"}, {"symbol": "6890", "name": "來億-KY", "industry": "電子"}, {"symbol": "6901", "name": "鑽石投資", "industry": "其他"}, {"symbol": "6902", "name": "GOGOLOOK", "industry": "其他"}, {"symbol": "6906", "name": "現觀科", "industry": "其他"}, {"symbol": "6908", "name": "宏碁遊戲-創", "industry": "其他"}, {"symbol": "6909", "name": "創控", "industry": "其他"}, {"symbol": "6914", "name": "阜爾運通", "industry": "其他"}, {"symbol": "6916", "name": "華凌", "industry": "其他"}, {"symbol": "6918", "name": "愛派司", "industry": "其他"}, {"symbol": "6919", "name": "康霈*", "industry": "其他"}, {"symbol": "6921", "name": "嘉雨思-創", "industry": "其他"}, {"symbol": "6923", "name": "中台", "industry": "其他"}, {"symbol": "6924", "name": "榮惠-KY創", "industry": "其他"}, {"symbol": "6928", "name": "攸泰科技", "industry": "其他"}, {"symbol": "6931", "name": "青松健康", "industry": "生技"}, {"symbol": "6933", "name": "AMAX-KY", "industry": "其他"}, {"symbol": "6934", "name": "心誠鎂", "industry": "其他"}, {"symbol": "6936", "name": "永鴻生技", "industry": "生技"}, {"symbol": "6937", "name": "天虹", "industry": "其他"}, {"symbol": "6944", "name": "兆聯實業", "industry": "其他"}, {"symbol": "6949", "name": "沛爾生醫-創", "industry": "其他"}, {"symbol": "6951", "name": "青新-創", "industry": "其他"}, {"symbol": "6952", "name": "大武山", "industry": "其他"}, {"symbol": "6955", "name": "邦睿生技-創", "industry": "生技"}, {"symbol": "6957", "name": "裕慶-KY", "industry": "其他"}, {"symbol": "6958", "name": "日盛台駿", "industry": "其他"}, {"symbol": "6962", "name": "奕力-KY", "industry": "其他"}, {"symbol": "6965", "name": "中傑-KY", "industry": "其他"}, {"symbol": "6969", "name": "成信實業*-創", "industry": "其他"}, {"symbol": "6988", "name": "威力暘-創", "industry": "其他"}, {"symbol": "6994", "name": "富威電力", "industry": "重電"}, {"symbol": "7610", "name": "聯友金屬-創", "industry": "其他"}, {"symbol": "7631", "name": "聚賢研發-創", "industry": "其他"}, {"symbol": "7705", "name": "三商餐飲", "industry": "餐飲"}, {"symbol": "7711", "name": "永擎", "industry": "其他"}, {"symbol": "7721", "name": "微程式", "industry": "其他"}, {"symbol": "7722", "name": "LINEPAY", "industry": "其他"}, {"symbol": "7730", "name": "暉盛-創", "industry": "其他"}, {"symbol": "7732", "name": "金興精密", "industry": "其他"}, {"symbol": "7736", "name": "虎山", "industry": "其他"}, {"symbol": "7740", "name": "熙特爾-創", "industry": "其他"}, {"symbol": "7749", "name": "意騰-KY", "industry": "其他"}, {"symbol": "7750", "name": "新代", "industry": "其他"}, {"symbol": "7760", "name": "享溫馨", "industry": "其他"}, {"symbol": "7765", "name": "中華資安", "industry": "其他"}, {"symbol": "7768", "name": "頌勝科技", "industry": "其他"}, {"symbol": "7769", "name": "鴻勁", "industry": "其他"}, {"symbol": "7780", "name": "大研生醫*", "industry": "其他"}, {"symbol": "7786", "name": "東方風能", "industry": "其他"}, {"symbol": "7788", "name": "松川精密", "industry": "其他"}, {"symbol": "7791", "name": "皇家可口", "industry": "其他"}, {"symbol": "7795", "name": "長廣", "industry": "其他"}, {"symbol": "7799", "name": "禾榮科", "industry": "其他"}, {"symbol": "7821", "name": "神數", "industry": "其他"}, {"symbol": "7822", "name": "倍利科", "industry": "其他"}, {"symbol": "7823", "name": "奧義賽博-KY創", "industry": "其他"}, {"symbol": "8011", "name": "台通", "industry": "電子"}, {"symbol": "8016", "name": "矽創", "industry": "IC設計"}, {"symbol": "8021", "name": "尖點", "industry": "電子"}, {"symbol": "8028", "name": "昇陽半導體", "industry": "重電"}, {"symbol": "8033", "name": "雷虎", "industry": "電子"}, {"symbol": "8039", "name": "台虹", "industry": "電子"}, {"symbol": "8045", "name": "達運光電", "industry": "電子"}, {"symbol": "8070", "name": "長華*", "industry": "電子"}, {"symbol": "8072", "name": "陞泰", "industry": "電子"}, {"symbol": "8081", "name": "致新", "industry": "電子"}, {"symbol": "8101", "name": "華冠", "industry": "其他"}, {"symbol": "8103", "name": "瀚荃", "industry": "其他"}, {"symbol": "8104", "name": "錸寶", "industry": "其他"}, {"symbol": "8105", "name": "凌巨", "industry": "其他"}, {"symbol": "8110", "name": "華東", "industry": "其他"}, {"symbol": "8112", "name": "至上", "industry": "其他"}, {"symbol": "8114", "name": "振樺電", "industry": "其他"}, {"symbol": "8131", "name": "福懋科", "industry": "其他"}, {"symbol": "8150", "name": "南茂", "industry": "面板"}, {"symbol": "8162", "name": "微矽電子-創", "industry": "其他"}, {"symbol": "8163", "name": "達方", "industry": "其他"}, {"symbol": "8201", "name": "無敵", "industry": "電子"}, {"symbol": "8210", "name": "勤誠", "industry": "電子"}, {"symbol": "8213", "name": "志超", "industry": "電子"}, {"symbol": "8215", "name": "明基材", "industry": "電子"}, {"symbol": "8222", "name": "寶一", "industry": "電子"}, {"symbol": "8249", "name": "菱光", "industry": "電子"}, {"symbol": "8261", "name": "富鼎", "industry": "電子"}, {"symbol": "8271", "name": "宇瞻", "industry": "電子"}, {"symbol": "8341", "name": "日友", "industry": "電子"}, {"symbol": "8367", "name": "建新國際", "industry": "電子"}, {"symbol": "8374", "name": "羅昇", "industry": "電子"}, {"symbol": "8404", "name": "百和���業-KY", "industry": "零售"}, {"symbol": "8411", "name": "福貞-KY", "industry": "零售"}, {"symbol": "8422", "name": "可寧衛*", "industry": "零售"}, {"symbol": "8429", "name": "金麗-KY", "industry": "零售"}, {"symbol": "8438", "name": "昶昕", "industry": "零售"}, {"symbol": "8442", "name": "威宏-KY", "industry": "零售"}, {"symbol": "8443", "name": "阿瘦", "industry": "零售"}, {"symbol": "8462", "name": "柏文", "industry": "零售"}, {"symbol": "8463", "name": "潤泰材", "industry": "零售"}, {"symbol": "8464", "name": "億豐", "industry": "零售"}, {"symbol": "8466", "name": "美吉吉-KY", "industry": "零售"}, {"symbol": "8467", "name": "波力-KY", "industry": "零售"}, {"symbol": "8473", "name": "山林水", "industry": "零售"}, {"symbol": "8476", "name": "台境*", "industry": "零售"}, {"symbol": "8478", "name": "東哥遊艇", "industry": "零售"}, {"symbol": "8481", "name": "政伸", "industry": "零售"}, {"symbol": "8482", "name": "商億-KY", "industry": "零售"}, {"symbol": "8487", "name": "愛爾達-創", "industry": "零售"}, {"symbol": "8488", "name": "吉源-KY", "industry": "零售"}, {"symbol": "8499", "name": "鼎炫-KY", "industry": "零售"}, {"symbol": "8926", "name": "台汽電", "industry": "其他"}, {"symbol": "8940", "name": "新天地", "industry": "其他"}, {"symbol": "8996", "name": "高力", "industry": "其他"}, {"symbol": "9103", "name": "美德醫療-DR", "industry": "生技"}, {"symbol": "9105", "name": "泰金寶-DR", "industry": "航運"}, {"symbol": "9110", "name": "越南控-DR", "industry": "航運"}, {"symbol": "9136", "name": "巨騰-DR", "industry": "航運"}, {"symbol": "9802", "name": "鈺齊-KY", "industry": "其他"}, {"symbol": "9902", "name": "台火", "industry": "其他"}, {"symbol": "9904", "name": "寶成", "industry": "其他"}, {"symbol": "9905", "name": "大華", "industry": "其他"}, {"symbol": "9906", "name": "欣巴巴", "industry": "其他"}, {"symbol": "9907", "name": "統一實", "industry": "其他"}, {"symbol": "9908", "name": "大台北", "industry": "其他"}, {"symbol": "9911", "name": "櫻花", "industry": "其他"}, {"symbol": "9912", "name": "偉聯", "industry": "其他"}, {"symbol": "9914", "name": "美利達", "industry": "其他"}, {"symbol": "9917", "name": "中保科", "industry": "其他"}, {"symbol": "9918", "name": "欣天然", "industry": "其他"}, {"symbol": "9919", "name": "康那香", "industry": "其他"}, {"symbol": "9921", "name": "巨大", "industry": "其他"}, {"symbol": "9924", "name": "福興", "industry": "其他"}, {"symbol": "9925", "name": "新保", "industry": "其他"}, {"symbol": "9926", "name": "新海", "industry": "其他"}, {"symbol": "9927", "name": "泰銘", "industry": "其他"}, {"symbol": "9928", "name": "中視", "industry": "其他"}, {"symbol": "9929", "name": "秋雨", "industry": "其他"}, {"symbol": "9930", "name": "中聯資源", "industry": "其他"}, {"symbol": "9931", "name": "欣高", "industry": "其他"}, {"symbol": "9933", "name": "中鼎", "industry": "其他"}, {"symbol": "9934", "name": "成霖", "industry": "其他"}, {"symbol": "9935", "name": "慶豐富", "industry": "其他"}, {"symbol": "9937", "name": "全國", "industry": "其他"}, {"symbol": "9938", "name": "百和", "industry": "其他"}, {"symbol": "9939", "name": "宏全", "industry": "其他"}, {"symbol": "9940", "name": "信義", "industry": "其他"}, {"symbol": "9941", "name": "裕融", "industry": "其他"}, {"symbol": "9942", "name": "茂順", "industry": "其他"}, {"symbol": "9943", "name": "好樂迪", "industry": "其他"}, {"symbol": "9944", "name": "新麗", "industry": "其他"}, {"symbol": "9946", "name": "三發地產", "industry": "其他"}, {"symbol": "9955", "name": "佳龍", "industry": "其他"}, {"symbol": "9958", "name": "世紀鋼", "industry": "鋼構/重電"}, {"symbol": "NVDA", "name": "輝達", "industry": "AI晶片"}, {"symbol": "AAPL", "name": "蘋果", "industry": "科技硬體"}, {"symbol": "MSFT", "name": "微軟", "industry": "軟體/雲端"}, {"symbol": "AMD", "name": "超微", "industry": "AI晶片"}, {"symbol": "TSLA", "name": "特斯拉", "industry": "電動車"}, {"symbol": "META", "name": "Meta", "industry": "科技平台"}, {"symbol": "GOOGL", "name": "Alphabet", "industry": "科技平台"}, {"symbol": "AMZN", "name": "亞馬遜", "industry": "電商/雲端"}, {"symbol": "AVGO", "name": "博通", "industry": "半導體"}, {"symbol": "TSM", "name": "台積電ADR", "industry": "晶圓代工"}];

// ─── 股票名稱快取（localStorage） ────────────────────────────────────────────
// 不再使用靜態對照表，改由後端 Yahoo API 即時取得並快取
const NAME_CACHE_KEY = "stockNameCache_v3";

function readNameCache() {
  try { return JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeNameCache(cache) {
  try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// 從 Yahoo chart meta 取中文名（只有包含中文字才回傳，否則回傳空字串）
function extractChineseName(yahooName = "") {
  const raw = String(yahooName || "").trim();
  if (!raw) return "";
  // Yahoo shortName 有時是英文（例如 "Pan Jit International Inc."），這種就不用
  if (!/[一-鿿]/.test(raw)) return "";
  return cleanStockName(raw);
}

// 統一清理股票名稱（移除公司登記後綴、多餘空白）
function cleanStockName(name = "") {
  return String(name || "")
    .replace(/股份有限公司/g, "")
    .replace(/有限股份公司/g, "")
    .replace(/有限公司/g, "")
    .replace(/控股有限公司/g, "")
    .replace(/集團有限公司/g, "")
    .replace(/國際股份有限公司/g, "")
    .replace(/科技股份有限公司/g, "科技")
    .replace(/工業股份有限公司/g, "工業")
    .replace(/電子股份有限公司/g, "電子")
    .replace(/實業股份有限公司/g, "實業")
    .replace(/企業股份有限公司/g, "企業")
    .replace(/製造股份有限公司/g, "製造")
    .replace(/股份$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 同步查快取，找不到就回傳代號
function getDisplayName(symbol, fallback = "") {
  const key = String(symbol || "").toUpperCase().replace(/\.(TW|TWO)$/i, "");
  const cache = readNameCache();
  if (cache[key] && /[一-鿿]/.test(cache[key])) return cache[key];
  const raw = String(fallback || "").trim();
  const looksEnglish = /[A-Za-z]{4,}/.test(raw) && !/[一-鿿]/.test(raw);
  return (!raw || raw === key || looksEnglish) ? key : raw;
}

// 查股票名稱：先查快取，沒有就問後端（後端查 Yahoo），結果存入快取
// ─── 產業分類快取 ────────────────────────────────────────────────────────────
const INDUSTRY_CACHE_KEY = "stockIndustryCache_v1";
function readIndustryCache() {
  try { return JSON.parse(localStorage.getItem(INDUSTRY_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeIndustryCache(cache) {
  try { localStorage.setItem(INDUSTRY_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
function getIndustry(symbol) {
  const key = String(symbol || "").toUpperCase().replace(/\.(TW|TWO)$/i, "");
  return readIndustryCache()[key] || "";
}
function saveIndustry(symbol, industry) {
  if (!symbol || !industry) return;
  const key = String(symbol).toUpperCase().replace(/\.(TW|TWO)$/i, "");
  const cache = readIndustryCache();
  cache[key] = industry;
  writeIndustryCache(cache);
}

async function fetchAndCacheName(symbol) {
  const key = String(symbol || "").toUpperCase().replace(/\.(TW|TWO)$/i, "");
  const cache = readNameCache();
  if (cache[key] && /[\u4e00-\u9fff]/.test(cache[key])) return cache[key];
  try {
    const r = await fetch(`${API_BASE}/api/yahoo/name/${encodeURIComponent(key)}`);
    if (!r.ok) return key;
    const data = await r.json();
    if (data.name && data.name !== key && /[\u4e00-\u9fff]/.test(data.name)) {
      cache[key] = data.name;
      writeNameCache(cache);
    }
    if (data.industry) saveIndustry(key, data.industry);
    return cache[key] || key;
  } catch {}
  return key;
}
// 儲存名稱到快取
function saveName(symbol, name) {
  if (!symbol || !name) return;
  const key = String(symbol).toUpperCase().replace(/\.(TW|TWO)$/i, "");
  if (!key || name === key) return;
  const cache = readNameCache();
  cache[key] = name;
  writeNameCache(cache);
}


function klineSma(values, period, endIndex = values.length - 1) {
  if (!values?.length || endIndex < period - 1) return null;
  const slice = values.slice(endIndex - period + 1, endIndex + 1);
  if (slice.length < period || slice.some((v) => !Number.isFinite(v))) return null;
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function klineSignal(signalName, direction, strength, riskLevel, description, triggered) {
  return {
    signalName,
    direction,
    strength: Math.max(0, Math.min(100, Math.round(strength || 0))),
    riskLevel,
    description,
    triggered: Boolean(triggered),
  };
}

function enrichKlineContext(rawCandles = []) {
  const candles = rawCandles
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .map((c) => ({ ...c, volume: Number(c.volume || 0) }));

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  return candles.map((c, i) => {
    const ma5 = klineSma(closes, 5, i);
    const ma10 = klineSma(closes, 10, i);
    const ma20 = klineSma(closes, 20, i);
    const ma60 = klineSma(closes, 60, i);
    const volumeMA5 = klineSma(volumes, 5, i);
    const volumeMA20 = klineSma(volumes, 20, i);
    const prevHigh = i > 0 ? Math.max(...highs.slice(Math.max(0, i - 20), i)) : null;
    const prevLow = i > 0 ? Math.min(...lows.slice(Math.max(0, i - 20), i)) : null;
    const high20 = Math.max(...highs.slice(Math.max(0, i - 19), i + 1));
    const low20 = Math.min(...lows.slice(Math.max(0, i - 19), i + 1));
    const range20 = high20 - low20 || 1;
    const positionRatio = (c.close - low20) / range20;
    const trend20 = i >= 20 ? ((c.close - candles[i - 20].close) / candles[i - 20].close) * 100 : 0;

    return {
      ...c,
      ma5,
      ma10,
      ma20,
      ma60,
      volumeMA5,
      volumeMA20,
      prevHigh,
      prevLow,
      high20,
      low20,
      positionRatio,
      trend20,
      body: Math.abs(c.close - c.open),
      upperShadow: c.high - Math.max(c.open, c.close),
      lowerShadow: Math.min(c.open, c.close) - c.low,
      range: Math.max(0.0001, c.high - c.low),
      isRed: c.close > c.open,
      isBlack: c.close < c.open,
      volumeRatio20: volumeMA20 ? c.volume / volumeMA20 : 0,
    };
  });
}

function getTrendPosition(candles) {
  const c = candles.at(-1);
  if (!c) return "middle";
  if (c.positionRatio <= 0.33 || (c.trend20 <= -8 && c.close <= (c.ma20 || c.close) * 1.03)) return "low";
  if (c.positionRatio >= 0.67 || (c.trend20 >= 10 && c.close >= (c.ma20 || c.close) * 0.98)) return "high";
  return "middle";
}

function detectHammer(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.lowerShadow >= c.body * 2.2 && c.upperShadow <= c.range * 0.22 && c.body <= c.range * 0.36 && pos === "low";
  return klineSignal("錘子線 Hammer", "bullish", 70, "medium", "低檔長下影，代表下方買盤承接。", triggered);
}

function detectHangingMan(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.lowerShadow >= c.body * 2.1 && c.body <= c.range * 0.38 && pos === "high";
  return klineSignal("懸掛人 Hanging Man", "bearish", 68, "high", "高檔長下影但實體小，可能代表買盤開始不穩。", triggered);
}

function detectShootingStar(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.upperShadow >= c.body * 2.2 && c.lowerShadow <= c.range * 0.18 && c.body <= c.range * 0.36 && pos === "high";
  return klineSignal("射擊星 Shooting Star", "bearish", 72, "high", "高檔長上影，代表上方賣壓明顯。", triggered);
}

function detectMorningStar(candles) {
  if (candles.length < 3) return klineSignal("晨星 Morning Star", "bullish", 0, "medium", "", false);
  const [a, b, c] = candles.slice(-3);
  const triggered = a.isBlack && a.body > a.range * 0.48 && b.body < b.range * 0.32 && c.isRed && c.close > (a.open + a.close) / 2 && getTrendPosition(candles.slice(0, -2)) === "low";
  return klineSignal("晨星 Morning Star", "bullish", 82, "low", "低檔三日反轉型態，空方動能轉弱後紅K確認。", triggered);
}

function detectEveningStar(candles) {
  if (candles.length < 3) return klineSignal("傍晚之星 Evening Star", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const triggered = a.isRed && a.body > a.range * 0.45 && b.body < b.range * 0.32 && c.isBlack && c.close < (a.open + a.close) / 2 && getTrendPosition(candles.slice(0, -2)) === "high";
  return klineSignal("傍晚之星 Evening Star", "bearish", 82, "high", "高檔三日反轉型態，多方動能轉弱後黑K確認。", triggered);
}

function detectBullishEngulfing(candles) {
  if (candles.length < 2) return klineSignal("看漲吞噬 Bullish Engulfing", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isBlack && c.isRed && c.open <= p.close && c.close >= p.open && getTrendPosition(candles.slice(0, -1)) !== "high";
  return klineSignal("看漲吞噬 Bullish Engulfing", "bullish", 76, "medium", "紅K吞噬前一根黑K，買盤反攻。", triggered);
}

function detectBearishEngulfing(candles) {
  if (candles.length < 2) return klineSignal("看跌吞噬 Bearish Engulfing", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isRed && c.isBlack && c.open >= p.close && c.close <= p.open && getTrendPosition(candles.slice(0, -1)) !== "low";
  return klineSignal("看跌吞噬 Bearish Engulfing", "bearish", 76, "high", "黑K吞噬前一根紅K，賣壓反轉。", triggered);
}

function detectPiercingLine(candles) {
  if (candles.length < 2) return klineSignal("刺透線 Piercing Line", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const midpoint = (p.open + p.close) / 2;
  const triggered = p.isBlack && c.isRed && c.open < p.close && c.close > midpoint && c.close < p.open && getTrendPosition(candles.slice(0, -1)) === "low";
  return klineSignal("刺透線 Piercing Line", "bullish", 70, "medium", "低檔開低走高並收回前黑K一半以上。", triggered);
}

function detectDarkCloudCover(candles) {
  if (candles.length < 2) return klineSignal("烏雲罩頂 Dark Cloud Cover", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const midpoint = (p.open + p.close) / 2;
  const triggered = p.isRed && c.isBlack && c.open > p.close && c.close < midpoint && c.close > p.open && getTrendPosition(candles.slice(0, -1)) === "high";
  return klineSignal("烏雲罩頂 Dark Cloud Cover", "bearish", 70, "high", "高檔開高走低並跌破前紅K中線。", triggered);
}

function detectThreeWhiteSoldiers(candles) {
  if (candles.length < 3) return klineSignal("紅三兵 Three White Soldiers", "bullish", 0, "medium", "", false);
  const last = candles.slice(-3);
  const triggered = last.every((c) => c.isRed && c.body > c.range * 0.45) && last[0].close < last[1].close && last[1].close < last[2].close;
  return klineSignal("紅三兵 Three White Soldiers", "bullish", 78, "medium", "連續三根強勢紅K，買盤延續。", triggered);
}

function detectThreeBlackCrows(candles) {
  if (candles.length < 3) return klineSignal("黑三兵 Three Black Crows", "bearish", 0, "high", "", false);
  const last = candles.slice(-3);
  const triggered = last.every((c) => c.isBlack && c.body > c.range * 0.45) && last[0].close > last[1].close && last[1].close > last[2].close;
  return klineSignal("黑三兵 Three Black Crows", "bearish", 78, "high", "連續三根強勢黑K，賣壓延續。", triggered);
}

function detectThreeOutsideDown(candles) {
  if (candles.length < 3) return klineSignal("三外面朝下 Three Outside Down", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const engulf = a.isRed && b.isBlack && b.open >= a.close && b.close <= a.open;
  const triggered = engulf && c.isBlack && c.close < b.close;
  return klineSignal("三外面朝下 Three Outside Down", "bearish", 80, "high", "看跌吞噬後續跌確認。", triggered);
}

function detectBullishBreakout(candles) {
  const c = candles.at(-1);
  const triggered = c && c.prevHigh && c.close > c.prevHigh && c.isRed;
  return klineSignal("看漲突破 Bullish Breakout", "bullish", 86, "medium", "收盤突破近20日前高，動能轉強。", triggered);
}

function detectGapUpBreakout(candles) {
  if (candles.length < 2) return klineSignal("跳空突破 Gap Up Breakout", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.open > p.high * 1.005 && c.close > (c.prevHigh || p.high);
  return klineSignal("跳空突破 Gap Up Breakout", "bullish", 82, "medium", "跳空開高並突破前高，資金急速進場。", triggered);
}

function detectLongRedPlatformBreakout(candles) {
  const c = candles.at(-1);
  if (!c || candles.length < 25) return klineSignal("長紅突破平台", "bullish", 0, "medium", "", false);
  const prev = candles.slice(-25, -1);
  const platformHigh = Math.max(...prev.map((x) => x.high));
  const platformLow = Math.min(...prev.map((x) => x.low));
  const platformNarrow = (platformHigh - platformLow) / platformLow < 0.16;
  const triggered = platformNarrow && c.isRed && c.body > c.range * 0.55 && c.close > platformHigh;
  return klineSignal("長紅突破平台", "bullish", 88, "medium", "平台整理後以長紅K突破，主升段機率提升。", triggered);
}

function detectWBottomBreakout(candles) {
  if (candles.length < 45) return klineSignal("W底突破", "bullish", 0, "medium", "", false);
  const recent = candles.slice(-45);
  const lows = recent.map((c, i) => ({ i, low: c.low }));
  const sorted = lows.sort((a, b) => a.low - b.low).slice(0, 5).sort((a, b) => a.i - b.i);
  const c = candles.at(-1);
  const neckline = Math.max(...recent.slice(10, 35).map((x) => x.high));
  const triggered = sorted.length >= 2 && Math.abs(sorted[0].low - sorted.at(-1).low) / sorted[0].low < 0.08 && c.close > neckline;
  return klineSignal("W底突破", "bullish", 86, "medium", "雙底型態完成並突破頸線。", triggered);
}

function detectHeadShoulderBottom(candles) {
  if (candles.length < 60) return klineSignal("頭肩底", "bullish", 0, "medium", "", false);
  const c = candles.at(-1);
  const low60 = Math.min(...candles.slice(-60).map((x) => x.low));
  const neckline = Math.max(...candles.slice(-35, -5).map((x) => x.high));
  const triggered = c.close > neckline && candles.slice(-35, -5).some((x) => x.low <= low60 * 1.03);
  return klineSignal("頭肩底", "bullish", 82, "medium", "底部型態疑似完成，突破頸線。", triggered);
}

function detectStandAbove5MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && p?.ma5 && p.close <= p.ma5 && c.close > c.ma5;
  return klineSignal("站上5MA", "bullish", 58, "low", "收盤重新站上5日均線。", triggered);
}

function detectStandAbove20MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma20 && p?.ma20 && p.close <= p.ma20 && c.close > c.ma20;
  return klineSignal("站上20MA", "bullish", 64, "medium", "收盤站回20日均線，中期趨勢改善。", triggered);
}

function detectGoldenCross(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && c?.ma20 && p?.ma5 && p?.ma20 && p.ma5 <= p.ma20 && c.ma5 > c.ma20;
  return klineSignal("黃金交叉：MA5上穿MA20", "bullish", 76, "medium", "短均線上穿中期均線，趨勢轉強。", triggered);
}

function detectBottomVolumeLongRed(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "low" && c.isRed && c.body > c.range * 0.55 && c.volumeRatio20 >= 1.5;
  return klineSignal("底部爆量長紅", "bullish", 86, "medium", "低檔放量長紅，可能為主力進場。", triggered);
}

function detectLowDoji(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "low" && c.body <= c.range * 0.12;
  return klineSignal("低檔十字星", "bullish", 52, "medium", "低檔十字星代表賣壓暫歇，需後續紅K確認。", triggered);
}

function detectBullishHarami(candles) {
  if (candles.length < 2) return klineSignal("多方母子線", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isBlack && c.isRed && c.high < p.open && c.low > p.close && getTrendPosition(candles.slice(0, -1)) === "low";
  return klineSignal("多方母子線", "bullish", 58, "medium", "低檔母子線，空方動能收斂。", triggered);
}

function detectGapNotFilled(candles) {
  if (candles.length < 2) return klineSignal("缺口不回補", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.low > p.high && c.close > c.open;
  return klineSignal("缺口不回補", "bullish", 70, "medium", "向上跳空後未回補，買盤支撐強。", triggered);
}

function detectBreakPreviousHigh(candles) {
  const c = candles.at(-1);
  const triggered = c?.prevHigh && c.close > c.prevHigh;
  return klineSignal("突破前高", "bullish", 78, "medium", "收盤突破前高，趨勢延續。", triggered);
}

function detectDowntrendStop(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c && p && c.trend20 < -6 && c.close > p.high && c.volumeRatio20 >= 1.2;
  return klineSignal("碎冰中斷 / 下跌趨勢中止", "bullish", 68, "medium", "下跌趨勢中出現放量反彈並突破前一日高。", triggered);
}

function detectBullAlignment(candles) {
  const c = candles.at(-1);
  const triggered = c?.ma5 && c?.ma20 && c?.ma60 && c.ma5 > c.ma20 && c.ma20 > c.ma60;
  return klineSignal("多頭排列：MA5 > MA20 > MA60", "bullish", 82, "low", "短中長均線多頭排列，趨勢偏強。", triggered);
}

function detectGapDownBreakdown(candles) {
  if (candles.length < 2) return klineSignal("跳空跌破 Gap Down Breakdown", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.open < p.low * 0.995 && c.close < (c.prevLow || p.low);
  return klineSignal("跳空跌破 Gap Down Breakdown", "bearish", 82, "high", "跳空跌破前低，賣壓急速擴大。", triggered);
}

function detectLongBlackPlatformBreakdown(candles) {
  const c = candles.at(-1);
  if (!c || candles.length < 25) return klineSignal("長黑跌破平台", "bearish", 0, "high", "", false);
  const prev = candles.slice(-25, -1);
  const platformHigh = Math.max(...prev.map((x) => x.high));
  const platformLow = Math.min(...prev.map((x) => x.low));
  const platformNarrow = (platformHigh - platformLow) / platformLow < 0.16;
  const triggered = platformNarrow && c.isBlack && c.body > c.range * 0.55 && c.close < platformLow;
  return klineSignal("長黑跌破平台", "bearish", 88, "high", "平台整理後長黑跌破，趨勢轉弱。", triggered);
}

function detectMTopBreakdown(candles) {
  if (candles.length < 45) return klineSignal("M頭跌破", "bearish", 0, "high", "", false);
  const recent = candles.slice(-45);
  const c = candles.at(-1);
  const neckline = Math.min(...recent.slice(10, 35).map((x) => x.low));
  const highCount = recent.filter((x) => x.high >= Math.max(...recent.map((y) => y.high)) * 0.94).length;
  const triggered = highCount >= 2 && c.close < neckline;
  return klineSignal("M頭跌破", "bearish", 86, "high", "雙頭型態疑似完成並跌破頸線。", triggered);
}

function detectHeadShoulderTop(candles) {
  if (candles.length < 60) return klineSignal("頭肩頂", "bearish", 0, "high", "", false);
  const c = candles.at(-1);
  const high60 = Math.max(...candles.slice(-60).map((x) => x.high));
  const neckline = Math.min(...candles.slice(-35, -5).map((x) => x.low));
  const triggered = c.close < neckline && candles.slice(-35, -5).some((x) => x.high >= high60 * 0.97);
  return klineSignal("頭肩頂", "bearish", 82, "high", "高檔頭肩頂疑似成立並跌破頸線。", triggered);
}

function detectBreakBelow5MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && p?.ma5 && p.close >= p.ma5 && c.close < c.ma5;
  return klineSignal("跌破5MA", "bearish", 58, "medium", "收盤跌破5日均線。", triggered);
}

function detectBreakBelow20MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma20 && p?.ma20 && p.close >= p.ma20 && c.close < c.ma20;
  return klineSignal("跌破20MA", "bearish", 66, "high", "收盤跌破20日均線，中期趨勢轉弱。", triggered);
}

function detectDeathCross(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && c?.ma20 && p?.ma5 && p?.ma20 && p.ma5 >= p.ma20 && c.ma5 < c.ma20;
  return klineSignal("死亡交叉：MA5下穿MA20", "bearish", 76, "high", "短均線跌破中期均線，趨勢轉弱。", triggered);
}

function detectHighVolumeLongBlack(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "high" && c.isBlack && c.body > c.range * 0.55 && c.volumeRatio20 >= 1.5;
  return klineSignal("高檔爆量長黑", "bearish", 88, "high", "高檔爆量長黑，可能為主力出貨。", triggered);
}

function detectHighLongUpperShadow(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "high" && c.upperShadow >= c.body * 1.8 && c.upperShadow >= c.range * 0.42;
  return klineSignal("高檔長上影", "bearish", 76, "high", "高檔上影線偏長，上方賣壓重。", triggered);
}

function detectGapFillFail(candles) {
  if (candles.length < 3) return klineSignal("缺口回補失敗", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const gapUp = b.low > a.high;
  const triggered = gapUp && c.close < a.high;
  return klineSignal("缺口回補失敗", "bearish", 72, "high", "向上缺口遭回補且收弱，追價動能失敗。", triggered);
}

function detectFakeBreakout(candles) {
  const c = candles.at(-1);
  if (!c || !c.prevHigh) return klineSignal("假突破", "bearish", 0, "high", "", false);
  const triggered = c.high > c.prevHigh && c.close < c.prevHigh && c.upperShadow > c.body * 1.4;
  return klineSignal("假突破", "bearish", 86, "high", "盤中突破前高但收盤跌回，留意假突破。", triggered);
}

function detectPriceVolumeDivergence(candles) {
  if (candles.length < 6) return klineSignal("量價背離", "bearish", 0, "medium", "", false);
  const recent = candles.slice(-6);
  const priceNewHigh = recent.at(-1).close >= Math.max(...recent.slice(0, -1).map((x) => x.close));
  const volumeLower = recent.at(-1).volume < klineSma(recent.map((x) => x.volume), 5, 4) * 0.75;
  const triggered = priceNewHigh && volumeLower && getTrendPosition(candles) === "high";
  return klineSignal("量價背離", "bearish", 62, "medium", "價格創高但量能未跟上，續航力下降。", triggered);
}

function detectBearAlignment(candles) {
  const c = candles.at(-1);
  const triggered = c?.ma5 && c?.ma20 && c?.ma60 && c.ma5 < c.ma20 && c.ma20 < c.ma60;
  return klineSignal("空頭排列：MA5 < MA20 < MA60", "bearish", 82, "high", "短中長均線空頭排列，趨勢偏弱。", triggered);
}

// 強勢股分類（依產業/類型）
function classifyStrongStock(stock) {
  const industry = stock?.baseType || stock?.officialIndustry || stock?.industry || "";
  const symbol = String(stock?.symbol || "");
  if (!symbol) return "其他";
  if (["NVDA","AMD","INTC","AVGO","QCOM","MU","TSM","UMC","ARM"].includes(symbol)) return "半導體";
  if (["AAPL","MSFT","GOOGL","GOOG","META","AMZN","NFLX"].includes(symbol)) return "科技";
  if (["TSLA","RIVN","NIO"].includes(symbol)) return "電動車";
  if (industry.includes("晶圓")) return "晶圓代工";
  if (industry.includes("IC設計")) return "IC設計";
  if (industry.includes("IC封測")) return "IC封測";
  if (industry.includes("記憶體")) return "記憶體";
  if (industry.includes("PCB")) return "PCB";
  if (industry.includes("散熱")) return "散熱";
  if (industry.includes("伺服器")) return "伺服器";
  if (industry.includes("面板")) return "面板";
  if (industry.includes("航運")) return "航運";
  if (industry.includes("金融")) return "金融";
  if (industry.includes("生技")) return "生技";
  if (industry.includes("ETF")) return "ETF";
  if (industry.includes("電源")) return "電源管理";
  if (industry.includes("光纖") || industry.includes("網通")) return "網通";
  return industry || "其他";
}

function buildKlineRadarSignal(stock) {
  const candles = enrichKlineContext(stock?.history || []);
  const latest = candles.at(-1) || {};
  const close = stock?.close || latest.close || 0;

  const bullishDetectors = [
    detectHammer, detectMorningStar, detectBullishEngulfing, detectPiercingLine,
    detectThreeWhiteSoldiers, detectBullishBreakout, detectGapUpBreakout,
    detectLongRedPlatformBreakout, detectWBottomBreakout, detectHeadShoulderBottom,
    detectStandAbove5MA, detectStandAbove20MA, detectGoldenCross,
    detectBottomVolumeLongRed, detectLowDoji, detectBullishHarami, detectGapNotFilled,
    detectBreakPreviousHigh, detectDowntrendStop, detectBullAlignment,
  ];

  const bearishDetectors = [
    detectHangingMan, detectShootingStar, detectEveningStar, detectBearishEngulfing,
    detectDarkCloudCover, detectThreeBlackCrows, detectThreeOutsideDown,
    detectGapDownBreakdown, detectLongBlackPlatformBreakdown, detectMTopBreakdown,
    detectHeadShoulderTop, detectBreakBelow5MA, detectBreakBelow20MA, detectDeathCross,
    detectHighVolumeLongBlack, detectHighLongUpperShadow, detectGapFillFail,
    detectFakeBreakout, detectPriceVolumeDivergence, detectBearAlignment,
  ];

  const bullishSignals = bullishDetectors.map((fn) => fn(candles)).filter((s) => s.triggered);
  const bearishSignals = bearishDetectors.map((fn) => fn(candles)).filter((s) => s.triggered);

  const volumeRatio = latest.volumeRatio20 || Number(stock?.volumeRatio || 0);
  const trendPosition = getTrendPosition(candles);
  const nearHigh = latest.prevHigh ? close >= latest.prevHigh * 0.98 : false;

  let bullishScore = bullishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bullishSignals.length);
  let bearishScore = bearishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bearishSignals.length);

  if (latest.close > latest.ma5) bullishScore += 8;
  if (latest.close > latest.ma20) bullishScore += 10;
  if (latest.ma5 > latest.ma20) bullishScore += 8;
  if (volumeRatio >= 1.5) bullishScore += 10;
  if (latest.prevHigh && latest.close > latest.prevHigh) bullishScore += 12;
  if (latest.range && (latest.high - latest.close) / latest.range <= 0.18) bullishScore += 8;
  if (latest.ma5 > latest.ma20 && latest.ma20 > latest.ma60) bullishScore += 12;

  if (latest.close < latest.ma5) bearishScore += 8;
  if (latest.close < latest.ma20) bearishScore += 12;
  if (latest.ma5 < latest.ma20) bearishScore += 8;
  if (latest.upperShadow > latest.body * 1.8 && trendPosition === "high") bearishScore += 10;
  if (latest.isBlack && volumeRatio >= 1.5) bearishScore += 12;
  if (latest.prevLow && latest.close < latest.prevLow) bearishScore += 12;
  if (latest.ma5 < latest.ma20 && latest.ma20 < latest.ma60) bearishScore += 12;

  const fakeSignal = bearishSignals.find((s) => s.signalName.includes("假突破"));
  const riskScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(bearishScore * 0.55 + (fakeSignal ? 25 : 0) + (trendPosition === "high" ? 12 : 0) + (volumeRatio >= 2 && latest.isBlack ? 14 : 0))
    )
  );

  bullishScore = Math.round(Math.max(0, Math.min(100, bullishScore)));
  bearishScore = Math.round(Math.max(0, Math.min(100, bearishScore)));

  const marketStructure =
    bullishScore >= 82 && trendPosition !== "high" ? "起漲初期" :
    bullishScore >= 78 && latest.ma5 > latest.ma20 && latest.ma20 > latest.ma60 ? "主升段" :
    trendPosition === "high" && bearishScore >= 55 ? "高檔震盪" :
    bearishScore >= 70 ? "轉弱初期" :
    latest.ma5 < latest.ma20 && latest.ma20 < latest.ma60 ? "空頭趨勢" :
    "盤整";

  const mainUpProbability = Math.max(0, Math.min(100, Math.round(bullishScore * 0.68 + (volumeRatio >= 1.5 ? 10 : 0) + (nearHigh ? 8 : 0) - riskScore * 0.28)));
  const fakeBreakoutRisk = Math.max(0, Math.min(100, Math.round(riskScore + (fakeSignal ? 20 : 0))));

  const signalTags = [
    ...bullishSignals.slice(0, 4).map((s) => s.signalName.replace(/：.*$/, "").split(" ")[0]),
    ...bearishSignals.slice(0, 3).map((s) => s.signalName.replace(/：.*$/, "").split(" ")[0]),
  ];

  const radarScore = Math.max(0, Math.min(100, Math.round(bullishScore - bearishScore * 0.35 + (volumeRatio >= 1.5 ? 8 : 0))));
  const radarLevel =
    radarScore >= 90 ? "S級訊號" :
    radarScore >= 78 ? "A級觀察" :
    radarScore >= 62 ? "B級追蹤" :
    bearishScore > bullishScore ? "風險優先" : "一般";

  return {
    radarScore,
    radarLevel,
    bullishSignals,
    bearishSignals,
    bullishScore,
    bearishScore,
    riskScore,
    marketStructure,
    mainUpProbability,
    fakeBreakoutRisk,
    signalTags: [...new Set(signalTags)],
    radarReasons: [
      ...bullishSignals.slice(0, 2).map((s) => s.description),
      ...bearishSignals.slice(0, 2).map((s) => s.description),
    ].filter(Boolean),
    candleTitle: bullishSignals[0]?.signalName || bearishSignals[0]?.signalName || stock?.candlePattern?.title || "未觸發明確型態",
    volumeTitle: volumeRatio >= 1.5 ? `成交量放大 ${volumeRatio.toFixed(2)}倍` : stock?.volumeSignal?.title || "量能一般",
    trendPosition,
    nearBreakout: nearHigh,
  };
}


function calcRecent3DayStrength(stock) {
  const history = stock?.history || [];
  const latest = history.at(-1);
  const base = history.at(-4) || history.at(0);
  const last3 = history.slice(-3);

  if (!latest || !base || last3.length === 0) {
    return {
      recent3DayScore: 0,
      recent3DayChange: 0,
      recent3DayVolumeRatio: stock?.volumeRatio || 0,
      recent3DayType: "資料不足",
    };
  }

  const recent3DayChange = base.close
    ? ((latest.close - base.close) / base.close) * 100
    : 0;

  const avg3Volume =
    last3.reduce((sum, x) => sum + (x.volume || 0), 0) / last3.length;

  const prev20 = history.slice(-24, -4);
  const avg20Volume = prev20.length
    ? prev20.reduce((sum, x) => sum + (x.volume || 0), 0) / prev20.length
    : avg3Volume || 1;

  const recent3DayVolumeRatio = avg20Volume ? avg3Volume / avg20Volume : 0;
  const closeNearHigh =
    latest.high && latest.close
      ? ((latest.high - latest.close) / latest.close) * 100
      : 999;

  let recent3DayScore = 0;
  if (recent3DayChange >= 3) recent3DayScore += 30;
  if (recent3DayChange >= 6) recent3DayScore += 25;
  if (recent3DayChange >= 10) recent3DayScore += 20;
  if (recent3DayVolumeRatio >= 1.3) recent3DayScore += 20;
  if (recent3DayVolumeRatio >= 2) recent3DayScore += 20;
  if (closeNearHigh <= 1.2) recent3DayScore += 15;
  if ((stock.score || 0) >= 70) recent3DayScore += 15;

  let recent3DayType = "近3日觀察";
  if (recent3DayChange >= 6 && recent3DayVolumeRatio >= 1.5) recent3DayType = "近3日爆量強勢";
  else if (recent3DayChange >= 6) recent3DayType = "近3日漲幅強勢";
  else if (recent3DayVolumeRatio >= 1.5) recent3DayType = "近3日量能強勢";
  else if ((stock.score || 0) >= 80) recent3DayType = "AI強勢";

  return {
    recent3DayScore: Math.round(recent3DayScore),
    recent3DayChange,
    recent3DayVolumeRatio,
    recent3DayType,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[＊*]/g, "")
    .replace(/[－—–]/g, "-")
    .replace(/\.TW$/i, "")
    .replace(/\.TWO$/i, "")
    .toUpperCase();
}

function buildChineseNameIndex() {
  // 已改用 Yahoo API 即時查名稱，不再維護靜態索引
  return [];
}

function resolveSymbol(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";



  const cleaned = raw.replace(/\s+/g, "");
  const upper = cleaned.toUpperCase();

  // 代碼 / 美股 / 已經是 Yahoo 格式
  if (/^[A-Z]{1,6}(\.[A-Z])?$/.test(upper)) return upper;
  if (/^\d{4,6}$/.test(upper)) return upper;
  if (/^\d{4,6}\.(TW|TWO)$/i.test(upper)) return upper;
  if (/^[A-Z]{1,6}\.(TW|TWO)$/i.test(upper)) return upper;

  // 允許使用「雷科.TW」「台積電.TW」這類輸入，先移除市場後綴再查中文名。
  const key = normalizeSearchText(raw);

  // 中文名查找現在由後端 Yahoo API 處理，這裡只處理代號

  const code = upper.match(/\d{4,6}[A-Z]?/)?.[0];
  if (code) return code;

  return upper;
}

function getKlineRequest(klineType, selectedRange = "1y") {
  const map = {
    "1m": { range: "1d", interval: "1m", label: "1分K" },
    "5m": { range: "5d", interval: "5m", label: "5分K" },
    "30m": { range: "1mo", interval: "30m", label: "30分K" },
    "1d": { range: selectedRange || "1y", interval: "1d", label: "日K" },
    "1wk": { range: "5y", interval: "1wk", label: "周K" },
    "1mo": { range: "10y", interval: "1mo", label: "月K" },
  };

  return map[klineType] || map["1d"];
}

function klineLabel(klineType) {
  return getKlineRequest(klineType).label;
}


function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


function buildYahooSymbolCandidates(input) {
  const raw = String(input || "").trim().toUpperCase();
  const resolved = resolveSymbol(raw);
  const base = String(resolved || raw).trim().toUpperCase();
  const noSuffix = base.replace(/\.(TW|TWO)$/i, "");

  const list = [];
  if (base) list.push(base);

  if (/^\d{4,6}$/.test(noSuffix)) {
    list.push(`${noSuffix}.TW`);
    list.push(`${noSuffix}.TWO`);
  }

  return [...new Set(list.filter(Boolean))];
}

async function fetchYahooChartResult(symbol, range = "6mo", interval = "1d") {
  const url = `${API_BASE}/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  return result ? { result, symbol } : null;
}

async function fetchYahooHistory(input, range = "6mo", interval = "1d") {
  const candidates = buildYahooSymbolCandidates(input);
  if (!candidates.length) throw new Error("請輸入股票代碼或名稱");

  let payload = null;
  let lastTried = "";

  for (const candidate of candidates) {
    lastTried = candidate;
    payload = await fetchYahooChartResult(candidate, range, interval);
    if (payload?.result) break;
  }

  if (!payload?.result) {
    throw new Error(`Yahoo 資料抓取失敗：${lastTried || input}`);
  }

  const { result, symbol } = payload;
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};

  const history = timestamps
    .map((t, i) => {
      const dt = new Date(t * 1000);
      return {
        time:
          interval === "1d"
            ? dt.toISOString().slice(0, 10)
            : t,
        date:
          interval === "1d"
            ? dt.toLocaleDateString("zh-TW")
            : dt.toLocaleString("zh-TW", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
        open: cleanNumber(quote.open?.[i]),
        high: cleanNumber(quote.high?.[i]),
        low: cleanNumber(quote.low?.[i]),
        close: cleanNumber(quote.close?.[i]),
        volume: cleanNumber(quote.volume?.[i]) || 0,
      };
    })
    .filter((x) => x.open && x.high && x.low && x.close);

  if (!history.length) throw new Error(`找不到有效K線資料：${symbol}`);

  // 從 Yahoo meta 取中文名（shortName 台股通常是中文，美股通常是英文）
  const metaRawName = meta.shortName || meta.longName || "";
  const metaChineseName = extractChineseName(metaRawName); // 只有含中文才會有值
  const cleanSymbol = String(symbol || "").replace(/\.(TW|TWO)$/i, "");
  if (metaChineseName) saveName(cleanSymbol, metaChineseName);

  return {
    symbol: cleanSymbol,
    yahooSymbol: symbol,
    yahooName: metaRawName,   // 原始名稱，供後續判斷
    name: metaChineseName || getDisplayName(cleanSymbol) || cleanSymbol,
    currency: meta.currency || "TWD",
    regularMarketPrice: meta.regularMarketPrice || history.at(-1)?.close || null,
    history,
  };
}

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
  }
  return current;
}

function stddev(values) {
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcRSI(closes, period = 14) {
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes) {
  if (closes.length < 35) return { dif: null, dea: null, hist: null };
  const difSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const part = closes.slice(0, i);
    const fast = ema(part, 12);
    const slow = ema(part, 26);
    if (fast !== null && slow !== null) difSeries.push(fast - slow);
  }
  const dif = difSeries.at(-1) ?? null;
  const dea = ema(difSeries, 9);
  const hist = dif !== null && dea !== null ? dif - dea : null;
  return { dif, dea, hist };
}

function calcKD(history, period = 9) {
  if (history.length < period) return { k: null, d: null, golden: false };
  let k = 50;
  let d = 50;
  let prevK = 50;
  let prevD = 50;

  history.forEach((_, index) => {
    if (index < period - 1) return;
    const slice = history.slice(index - period + 1, index + 1);
    const high = Math.max(...slice.map((x) => x.high));
    const low = Math.min(...slice.map((x) => x.low));
    const close = history[index].close;
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
    prevK = k;
    prevD = d;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
  });

  return { k, d, golden: prevK <= prevD && k > d };
}

function calcVolumeRatio(history) {
  if (history.length < 21) return null;
  const latestVol = history.at(-1)?.volume || 0;
  const avg20 = history.slice(-21, -1).reduce((sum, x) => sum + (x.volume || 0), 0) / 20;
  return avg20 ? latestVol / avg20 : null;
}

function rsiText(rsi) {
  if (rsi === null || rsi === undefined) return "資料不足";
  if (rsi >= 80) return "過熱，追高風險";
  if (rsi >= 70) return "偏強但過熱";
  if (rsi >= 55) return "多方偏強";
  if (rsi >= 45) return "中性整理";
  if (rsi >= 30) return "弱勢修正";
  return "超賣反彈觀察";
}

function analyzeVolumeSignal(history, changePct, volumeRatio) {
  if (!history.length || volumeRatio === null) {
    return { title: "量能不足", detail: "成交量資料不足，暫不判斷。" };
  }

  const latest = history.at(-1);
  const bodyPct = latest.open ? ((latest.close - latest.open) / latest.open) * 100 : 0;
  const isUp = changePct > 0.3 || bodyPct > 0.3;
  const isFlat = Math.abs(changePct) <= 0.6;
  const isHighVolume = volumeRatio >= 1.35;
  const isLowVolume = volumeRatio <= 0.8;

  if (isHighVolume && isUp) {
    return { title: "爆量上漲｜強勢", detail: "價格上漲且量能明顯放大，代表買盤積極。" };
  }
  if (isHighVolume && !isUp) {
    return { title: "爆量不漲｜出貨疑慮", detail: "成交量放大但價格沒有跟上，可能有上方賣壓。" };
  }
  if (isLowVolume && isUp) {
    return { title: "縮量上漲｜偏虛", detail: "價格上漲但量能不足，動能可靠度較低。" };
  }
  if (isLowVolume && isFlat) {
    return { title: "縮量整理｜醞釀", detail: "量縮且價格整理，可能在等待方向表態。" };
  }
  return { title: "量價中性", detail: "量價沒有明顯極端訊號，需搭配趨勢與型態。" };
}

function analyzeCandlePattern(history) {
  if (history.length < 2) return { title: "資料不足", detail: "K線資料不足。" };

  const latest = history.at(-1);
  const prev = history.at(-2);
  const range = latest.high - latest.low || 1;
  const body = Math.abs(latest.close - latest.open);
  const upperShadow = latest.high - Math.max(latest.open, latest.close);
  const lowerShadow = Math.min(latest.open, latest.close) - latest.low;
  const bodyRatio = body / range;
  const upperRatio = upperShadow / range;
  const lowerRatio = lowerShadow / range;
  const isUp = latest.close >= latest.open;

  if (bodyRatio <= 0.15) return { title: "十字線｜多空觀望", detail: "開收盤接近，代表多空拉鋸，常出現在轉折或整理區。" };
  if (upperRatio >= 0.45 && upperShadow > body * 1.5) return { title: "長上影線｜壓力大", detail: "盤中衝高後回落，上方賣壓明顯。" };
  if (lowerRatio >= 0.45 && lowerShadow > body * 1.5) return { title: "長下影線｜有支撐", detail: "盤中下殺後拉回，下方承接力道出現。" };
  if (isUp && latest.close > prev.high) return { title: "突破K｜偏強", detail: "收盤突破前一根高點，短線動能較強。" };
  if (!isUp && latest.close < prev.low) return { title: "跌破K｜偏弱", detail: "收盤跌破前一根低點，短線賣壓較重。" };
  if (isUp) return { title: "紅K｜買盤較強", detail: "收盤高於開盤，多方略占優勢。" };
  return { title: "黑K｜賣壓較強", detail: "收盤低於開盤，空方略占優勢。" };
}

function backtestStrategy(history) {
  if (history.length < 60) {
    return { trades: 0, winRate: 0, totalReturn: 0, maxDrawdown: 0, equity: [] };
  }

  let inPosition = false;
  let entry = 0;
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  let wins = 0;
  let trades = 0;
  const equityCurve = [];

  for (let i = 35; i < history.length; i++) {
    const slice = history.slice(0, i + 1);
    const closes = slice.map((x) => x.close);
    const ma5 = sma(closes, 5);
    const ma20 = sma(closes, 20);
    const rsi = calcRSI(closes);
    const macd = calcMACD(closes);
    const price = history[i].close;

    const buy = !inPosition && ma5 > ma20 && macd.hist > 0 && rsi > 45 && rsi < 72;
    const sell = inPosition && (ma5 < ma20 || rsi > 78 || macd.hist < 0);

    if (buy) {
      inPosition = true;
      entry = price;
    }

    if (sell) {
      const ret = ((price - entry) / entry) * 100;
      equity *= 1 + ret / 100;
      trades += 1;
      if (ret > 0) wins += 1;
      inPosition = false;
    }

    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, ((equity - peak) / peak) * 100);
    equityCurve.push({ time: history[i].time, value: Number(equity.toFixed(2)) });
  }

  return {
    trades,
    winRate: trades ? Math.round((wins / trades) * 100) : 0,
    totalReturn: Number((equity - 100).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    equity: equityCurve,
  };
}

function createTradeSignal({ score, rsi, macd, trendUp, longTrendUp, volumeRatio, changePct, volumeSignal, candlePattern, close, atr }) {
  const reasons = [];
  const risk = [];

  if (trendUp) reasons.push("短線均線偏多");
  else risk.push("短線均線尚未轉強");

  if (longTrendUp) reasons.push("中線趨勢偏多");
  else risk.push("中線趨勢仍需確認");

  if (macd?.hist > 0) reasons.push("MACD 動能翻正");
  else risk.push("MACD 動能偏弱");

  if (volumeRatio !== null && volumeRatio >= 1.25) reasons.push("成交量放大");
  if (volumeSignal?.title?.includes("出貨")) risk.push("爆量不漲，有出貨疑慮");
  if (candlePattern?.title?.includes("長上影")) risk.push("長上影線，上方賣壓大");
  if (rsi !== null && rsi >= 75) risk.push("RSI 過熱，追高風險較高");
  if (changePct > 5) risk.push("短線漲幅過大，容易震盪");

  let action = "HOLD";
  let label = "觀望";
  let tone = "neutral";

  if (score >= 78 && trendUp && macd?.hist > 0 && rsi < 75 && !volumeSignal?.title?.includes("出貨")) {
    action = "BUY";
    label = "偏多買進觀察";
    tone = "buy";
  } else if (score >= 60 && trendUp) {
    action = "HOLD";
    label = "偏多續抱";
    tone = "hold";
  } else if (score <= 35 || (!trendUp && macd?.hist < 0)) {
    action = "SELL";
    label = "偏弱避開";
    tone = "sell";
  }

  const safeAtr = atr || close * 0.025;
  const stopLoss = action === "BUY" ? close - safeAtr * 1.5 : close + safeAtr * 1.5;
  const takeProfit = action === "BUY" ? close + safeAtr * 2.5 : close - safeAtr * 2.0;

  return {
    action,
    label,
    tone,
    stopLoss,
    takeProfit,
    reasons: reasons.length ? reasons : ["尚未出現明確多方訊號"],
    risk: risk.length ? risk : ["目前未偵測到明顯風險，但仍需控管停損"],
  };
}

function calcATR(history, period = 14) {
  if (history.length <= period) return null;
  const trs = [];
  for (let i = 1; i < history.length; i++) {
    const highLow = history[i].high - history[i].low;
    const highClose = Math.abs(history[i].high - history[i - 1].close);
    const lowClose = Math.abs(history[i].low - history[i - 1].close);
    trs.push(Math.max(highLow, highClose, lowClose));
  }
  return sma(trs, period);
}

function predictWinRate({ score, rsi, trendUp, longTrendUp, volumeRatio, backtest }) {
  let rate = 45;
  if (score >= 80) rate += 14;
  else if (score >= 60) rate += 8;
  else if (score <= 35) rate -= 8;
  if (trendUp) rate += 6;
  if (longTrendUp) rate += 5;
  if (volumeRatio !== null && volumeRatio >= 1.25) rate += 5;
  if (rsi !== null && rsi > 70) rate -= 6;
  if (backtest?.winRate) rate = rate * 0.65 + backtest.winRate * 0.35;
  return Math.max(15, Math.min(85, Math.round(rate)));
}

function analyzeDayTrade(stock) {
  if (!stock?.close) return null;

  const history = stock.history || [];
  const latest = history.at(-1) || {};
  const prev = history.at(-2) || {};
  const close = stock.close;
  const open = latest.open ?? close;
  const prevClose = prev.close ?? close;
  const reasons = [];
  const risks = [];
  let score = 15; // 避免資料不足時永遠 0 分，先給基礎觀察分

  const rsi = stock.rsi ?? 50;
  const macdHist = stock.macdHist ?? 0;
  const changePct = stock.changePct ?? 0;
  const candlePct = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
  const bodyPct = open ? ((close - open) / open) * 100 : 0;

  let volumeRatio = stock.volumeRatio;
  if ((volumeRatio === null || volumeRatio === undefined) && history.length >= 6) {
    const latestVol = latest.volume || 0;
    const avgVol = history.slice(-6, -1).reduce((sum, x) => sum + (x.volume || 0), 0) / 5;
    volumeRatio = avgVol ? latestVol / avgVol : null;
  }
  volumeRatio = volumeRatio ?? 1;

  // 量能：當沖最重要，但門檻調整得比較合理，不再容易 0 分
  if (volumeRatio >= 1.8) {
    score += 28;
    reasons.push("量能明顯放大");
  } else if (volumeRatio >= 1.25) {
    score += 20;
    reasons.push("量能放大");
  } else if (volumeRatio >= 0.85) {
    score += 8;
    reasons.push("量能尚可");
  } else {
    risks.push("量能偏低，容易假突破");
  }

  // 短線動能：同時看當日漲跌與最近一根分K
  if (changePct >= 0.2) {
    score += 14;
    reasons.push("當日漲幅轉正");
  } else if (changePct < -1.5) {
    score -= 8;
    risks.push("當日跌幅偏大");
  }

  if (candlePct > 0.05 || bodyPct > 0.05) {
    score += 14;
    reasons.push("最新分K偏多");
  } else if (candlePct < -0.25) {
    score -= 6;
    risks.push("最新分K轉弱");
  }

  // RSI：放寬到 45~72 比較符合當沖觀察，不再過度嚴苛
  if (rsi >= 50 && rsi <= 72) {
    score += 18;
    reasons.push("RSI 位於健康偏多區");
  } else if (rsi >= 45 && rsi < 50) {
    score += 8;
    reasons.push("RSI 接近轉強區");
  } else if (rsi > 78) {
    score -= 14;
    risks.push("RSI 過熱，容易拉回");
  } else if (rsi < 40) {
    score -= 8;
    risks.push("RSI 偏弱，買盤不足");
  }

  // MACD：分K容易小幅震盪，允許接近翻正也給分
  if (macdHist > 0) {
    score += 16;
    reasons.push("MACD 短線動能翻正");
  } else if (macdHist > -0.03) {
    score += 6;
    reasons.push("MACD 接近翻正");
  } else {
    risks.push("MACD 尚未轉強");
  }

  if (stock.ma5 && close > stock.ma5) {
    score += 8;
    reasons.push("價格站上 MA5");
  } else if (history.length >= 2 && close > prevClose) {
    score += 4;
    reasons.push("價格短線回升");
  } else {
    risks.push("價格尚未站上 MA5");
  }

  if (stock.ma20 && close > stock.ma20) {
    score += 6;
    reasons.push("價格站上 MA20");
  }

  if (stock.candlePattern?.title?.includes("長上影")) {
    score -= 12;
    risks.push("長上影線，上方賣壓較大");
  }

  if (stock.volumeSignal?.title?.includes("出貨")) {
    score -= 16;
    risks.push("爆量不漲，有出貨疑慮");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const canEnter = finalScore >= 65 && !stock.volumeSignal?.title?.includes("出貨") && rsi < 78;

  let signal = "❌ 不建議當沖";
  let tone = "sell";
  if (canEnter) {
    signal = "🔥 現在可進場觀察";
    tone = "buy";
  } else if (finalScore >= 45) {
    signal = "⚡ 觀察，等突破再進";
    tone = "hold";
  }

  const stopLoss = close * 0.985;
  const takeProfit = close * 1.025;

  return {
    score: finalScore,
    signal,
    tone,
    canEnter,
    entry: close,
    stopLoss,
    takeProfit,
    reasons: reasons.length ? reasons : ["資料偏少，先觀察量能與最新分K方向"],
    risks: risks.length ? risks : ["仍需嚴格控管停損與成交量變化"],
  };
}

function analyzeStock(stock) {
  const { history } = stock;
  const closes = history.map((x) => x.close).filter(Boolean);
  const latest = history.at(-1);
  const prev = history.at(-2);
  const close = latest?.close || stock.regularMarketPrice || null;
  const changePct = prev?.close && close ? ((close - prev.close) / prev.close) * 100 : 0;

  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const kd = calcKD(history);
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const volumeRatio = calcVolumeRatio(history);
  const backtest = backtestStrategy(history);
  const volumeSignal = analyzeVolumeSignal(history, changePct, volumeRatio);
  const candlePattern = analyzeCandlePattern(history);
  const atr = calcATR(history);

  const high20 = Math.max(...history.slice(-20).map((x) => x.high));
  const low20 = Math.min(...history.slice(-20).map((x) => x.low));
  const breakout = close >= high20 * 0.98;
  const nearLow = close <= low20 * 1.05;
  const trendUp = ma5 !== null && ma20 !== null && ma5 > ma20;
  const longTrendUp = ma20 !== null && ma60 !== null && ma20 > ma60;
  const macdBull = macd.hist !== null && macd.hist > 0 && macd.dif > macd.dea;
  const rsiHealthy = rsi !== null && rsi >= 48 && rsi <= 70;
  const volumeHot = volumeRatio !== null && volumeRatio >= 1.25;
  const momentum = changePct > 0.5;

  // 多因子 AI 評分：技術面 + 量能 + 趨勢 + 波動 + 回測
  let techScore = 0;
  if (rsi !== null && rsi > 55) techScore += 50;
  if (macd?.hist > 0) techScore += 50;

  let volumeScore = 30;
  if (volumeRatio !== null) {
    if (volumeRatio > 1.35) volumeScore = 100;
    else if (volumeRatio > 1) volumeScore = 60;
  }

  let trendScore = 30;
  if (trendUp && longTrendUp) trendScore = 100;
  else if (trendUp) trendScore = 70;

  let volatilityScore = Math.min(Math.abs(changePct) * 10, 100);
  if (changePct < 0) volatilityScore *= 0.55;

  let backtestScore = 40;
  if (backtest.totalReturn > 10 && backtest.winRate >= 55) backtestScore = 90;
  else if (backtest.totalReturn > 0) backtestScore = 65;

  let score =
    techScore * 0.35 +
    volumeScore * 0.2 +
    trendScore * 0.25 +
    volatilityScore * 0.1 +
    backtestScore * 0.1;

  if (breakout) score += 6;
  if (kd.golden) score += 5;
  if (nearLow) score -= 6;
  if (rsi !== null && rsi > 78) score -= 10;

  const scoreClamped = Math.max(0, Math.min(100, Math.round(score)));

  const tags = [];
  if (trendUp) tags.push("短線多頭");
  if (longTrendUp) tags.push("中線多頭");
  if (macdBull) tags.push("MACD翻紅");
  if (kd.golden) tags.push("KD金叉");
  if (volumeHot) tags.push("放量");
  if (breakout) tags.push("接近突破");
  if (backtest.totalReturn > 0) tags.push("回測正報酬");

  let level = "📉 偏弱";
  if (scoreClamped >= 80) level = "🔥 強勢";
  else if (scoreClamped >= 60) level = "📈 偏多";
  else if (scoreClamped >= 40) level = "⚖️ 中性";

  const winRatePredict = predictWinRate({
    score: scoreClamped,
    rsi,
    trendUp,
    longTrendUp,
    volumeRatio,
    backtest,
  });

  const tradeSignal = createTradeSignal({
    score: scoreClamped,
    rsi,
    macd,
    trendUp,
    longTrendUp,
    volumeRatio,
    changePct,
    volumeSignal,
    candlePattern,
    close,
    atr,
  });

  const dayTrade = analyzeDayTrade({
    ...stock,
    close,
    changePct,
    volume: latest?.volume || 0,
    volumeRatio,
    rsi,
    macdHist: macd.hist,
    ma5,
    ma20,
    ma60,
    volumeSignal,
    candlePattern,
  });

  const nextDay = analyzeNextDayStrategy(
    buildNextDayInput({
      ...stock,
      history,
      close,
      volume: latest?.volume || 0,
      ma5,
      ma20,
      ma60,
      rsi,
      macdHist: macd.hist,
    })
  );

  return {
    ...stock,
    close,
    changePct,
    volume: latest?.volume || 0,
    volumeRatio,
    rsi,
    k: kd.k,
    d: kd.d,
    macdHist: macd.hist,
    ma5,
    ma20,
    ma60,
    score: scoreClamped,
    level,
    tags,
    backtest,
    volumeSignal,
    candlePattern,
    rsiLabel: rsiText(rsi),
    tradeSignal,
    winRatePredict,
    dayTrade,
    nextDay,
  };
}


// =========================
// 隔日沖 / 短線強勢股模型
// =========================
function detectFakeBreakoutForNextDay(stock) {
  const open = cleanNumber(stock.open) || 0;
  const high = cleanNumber(stock.high) || 0;
  const close = cleanNumber(stock.close) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const highest5 = cleanNumber(stock.highest5) || 0;

  const upperShadow = high - Math.max(open, close);
  const body = Math.abs(close - open);
  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;

  if (upperShadow > body * 1.5) return true;
  if (volumeRatio >= 2 && close < open) return true;
  if (close > highest5 && volumeRatio < 1.2) return true;

  return false;
}

function getNextDayRank(score) {
  if (score >= 160) return "S級強勢股";
  if (score >= 130) return "A級強勢股";
  if (score >= 100) return "B級觀察股";
  if (score >= 70) return "C級普通";
  return "弱勢";
}

function buildNextDayInput(stock, marketIndexChange = 0) {
  const history = stock.history || [];
  const latest = history.at(-1) || {};
  const prev = history.at(-2) || {};
  const highs = history.map((x) => x.high).filter((x) => Number.isFinite(x));
  const volumes = history.map((x) => x.volume || 0);

  const avgVolume5 =
    volumes.length >= 6
      ? volumes.slice(-6, -1).reduce((a, b) => a + b, 0) / 5
      : stock.volume || 1;

  return {
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close || stock.close,
    prevClose: prev.close,
    volume: latest.volume || stock.volume,
    avgVolume5,
    highest5: Math.max(...highs.slice(-6, -1), 0),
    highest20: Math.max(...highs.slice(-21, -1), 0),
    ma5: stock.ma5,
    ma20: stock.ma20,
    ma60: stock.ma60,
    rsi: stock.rsi,
    macd: stock.macdHist,
    macdSignal: 0,
    foreignBuy: stock.foreignBuy || 0,
    investmentBuy: stock.investmentBuy || 0,
    dealerBuy: stock.dealerBuy || 0,
    marketIndexChange,
  };
}

function calcGapUpProbability(stock) {
  const high = cleanNumber(stock.high) || 0;
  const low = cleanNumber(stock.low) || 0;
  const close = cleanNumber(stock.close) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const rsi = cleanNumber(stock.rsi) || 0;
  const marketIndexChange = cleanNumber(stock.marketIndexChange) || 0;
  const institutionalTotal =
    (cleanNumber(stock.foreignBuy) || 0) +
    (cleanNumber(stock.investmentBuy) || 0) +
    (cleanNumber(stock.dealerBuy) || 0);

  let probability = 0;
  const range = high - low;

  if (range > 0) {
    const closeStrength = (close - low) / range;
    probability += closeStrength * 30;
  }

  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;
  probability += Math.min(volumeRatio * 10, 30);

  if (institutionalTotal > 0) probability += 15;
  if (marketIndexChange > 0) probability += 15;
  if (rsi > 60) probability += 10;

  return Math.min(Math.round(probability * 100) / 100, 100);
}

function calcNextDayScore(stock) {
  let score = 0;

  const close = cleanNumber(stock.close) || 0;
  const prevClose = cleanNumber(stock.prevClose) || 0;
  const high = cleanNumber(stock.high) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const highest5 = cleanNumber(stock.highest5) || 0;
  const highest20 = cleanNumber(stock.highest20) || 0;
  const ma5 = cleanNumber(stock.ma5) || 0;
  const ma20 = cleanNumber(stock.ma20) || 0;
  const ma60 = cleanNumber(stock.ma60) || 0;
  const rsi = cleanNumber(stock.rsi) || 0;
  const macd = cleanNumber(stock.macd) || 0;
  const macdSignal = cleanNumber(stock.macdSignal) || 0;
  const marketIndexChange = cleanNumber(stock.marketIndexChange) || 0;
  const institutionalTotal =
    (cleanNumber(stock.foreignBuy) || 0) +
    (cleanNumber(stock.investmentBuy) || 0) +
    (cleanNumber(stock.dealerBuy) || 0);

  const changePercent = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;
  const closeToHigh = close ? ((high - close) / close) * 100 : 999;

  if (changePercent >= 3) score += 15;
  if (changePercent >= 5) score += 25;

  if (volumeRatio >= 1.5) score += 15;
  if (volumeRatio >= 2) score += 25;
  if (volumeRatio >= 3) score += 35;

  if (closeToHigh <= 1) score += 20;
  if (closeToHigh <= 0.5) score += 30;

  if (close > highest5) score += 25;
  if (close > highest20) score += 40;

  if (ma5 > ma20 && ma20 > ma60) score += 30;
  if (rsi >= 55 && rsi <= 75) score += 15;
  if (macd > macdSignal) score += 15;
  if (institutionalTotal > 0) score += 20;
  if (marketIndexChange > -1) score += 10;

  if (detectFakeBreakoutForNextDay(stock)) score -= 50;

  return Math.max(0, Math.round(score));
}

function analyzeNextDayStrategy(stock) {
  const score = calcNextDayScore(stock);
  const gapUpProbability = calcGapUpProbability(stock);
  const rank = getNextDayRank(score);
  const fakeBreakout = detectFakeBreakoutForNextDay(stock);

  let signal = "觀望";
  let tone = "neutral";

  if (score >= 130 && gapUpProbability >= 65 && !fakeBreakout) {
    signal = "隔日沖候選";
    tone = "buy";
  } else if (score >= 100 && !fakeBreakout) {
    signal = "短線觀察";
    tone = "hold";
  } else if (fakeBreakout) {
    signal = "假突破風險";
    tone = "sell";
  }

  return {
    nextDayScore: score,
    gapUpProbability,
    nextDayRank: rank,
    fakeBreakout,
    nextDaySignal: signal,
    nextDayTone: tone,
  };
}

function TradingChart({
  stock,
  showMA5,
  showMA20,
  showMA60,
  showBollinger,
  chartKey = "default",
  drawingLines = [],
  freeDrawings = [],
  drawingEnabled = false,
  drawingTool = "line",
  onCreateDrawing,
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const visibleRangeRef = useRef(null);
  const lastChartKeyRef = useRef(null);
  const [draftDrawing, setDraftDrawing] = useState(null);
  const [overlaySize, setOverlaySize] = useState({ width: 1, height: 560 });
  const [overlayTick, setOverlayTick] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !stock?.history?.length) return;

    const currentChartKey = `${stock.symbol || ""}-${chartKey}`;
    const shouldRestoreRange =
      lastChartKeyRef.current === currentChartKey && visibleRangeRef.current;

    const chart = createChart(containerRef.current, {
      height: 560,
      layout: { background: { color: "#060e1a" }, textColor: "#cbd5e1" },
      grid: {
        vertLines: { color: "rgba(56,189,248,.10)" },
        horzLines: { color: "rgba(56,189,248,.10)" },
      },
      rightPriceScale: { borderColor: "rgba(14,165,233,.20)" },
      timeScale: { borderColor: "rgba(14,165,233,.20)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
    });

    candleSeriesRef.current = candleSeries;

    const ma5Series = chart.addSeries(LineSeries, { color: "#fb923c", lineWidth: 2, priceLineVisible: false });
    const ma20Series = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2, priceLineVisible: false });
    const ma60Series = chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 2, priceLineVisible: false });
    const bollUpperSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.9)", lineWidth: 1, priceLineVisible: false });
    const bollMidSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.55)", lineWidth: 1, priceLineVisible: false });
    const bollLowerSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.9)", lineWidth: 1, priceLineVisible: false });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const candles = stock.history.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }));
    const closes = stock.history.map((x) => x.close);

    const buildMA = (period) =>
      stock.history
        .map((d, i) => {
          const value = sma(closes.slice(0, i + 1), period);
          return value ? { time: d.time, value } : null;
        })
        .filter(Boolean);

    const boll = stock.history
      .map((d, i) => {
        const part = closes.slice(Math.max(0, i - 19), i + 1);
        if (part.length < 20) return null;
        const mid = sma(part, 20);
        const sd = stddev(part);
        return { time: d.time, upper: mid + sd * 2, mid, lower: mid - sd * 2 };
      })
      .filter(Boolean);

    const volume = stock.history.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(239,68,68,.38)" : "rgba(34,197,94,.38)",
    }));

    candleSeries.setData(candles);

    const getLineColor = (line) => {
      if (line.type === "support") return "#22c55e";
      if (line.type === "stop") return "#f97316";
      if (line.type === "trend") return "#38bdf8";
      if (line.type === "zone") return "#a855f7";
      return "#ef4444";
    };

    const getLineTitle = (line) => {
      if (line.label) return line.label;
      if (line.type === "support") return "支撐";
      if (line.type === "stop") return "停損";
      if (line.type === "trend") return "趨勢線";
      if (line.type === "zone") return "價格區間";
      return "壓力";
    };

    drawingLines.forEach((line) => {
      const kind = line.kind || "horizontal";
      const color = getLineColor(line);

      if (kind === "trend") {
        const startBarsAgo = Number(line.startBarsAgo ?? 20);
        const endBarsAgo = Number(line.endBarsAgo ?? 0);
        const startPrice = Number(line.startPrice);
        const endPrice = Number(line.endPrice);

        const startIndex = Math.max(0, Math.min(candles.length - 1, candles.length - 1 - startBarsAgo));
        const endIndex = Math.max(0, Math.min(candles.length - 1, candles.length - 1 - endBarsAgo));

        if (Number.isFinite(startPrice) && Number.isFinite(endPrice) && candles[startIndex] && candles[endIndex]) {
          const trendSeries = chart.addSeries(LineSeries, {
            color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });

          trendSeries.setData([
            { time: candles[startIndex].time, value: startPrice },
            { time: candles[endIndex].time, value: endPrice },
          ]);
        }

        return;
      }

      if (kind === "zone") {
        const top = Number(line.top);
        const bottom = Number(line.bottom);
        if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;

        const upper = Math.max(top, bottom);
        const lower = Math.min(top, bottom);

        candleSeries.createPriceLine({
          price: upper,
          color,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${getLineTitle(line)} 上緣`,
        });

        candleSeries.createPriceLine({
          price: lower,
          color,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${getLineTitle(line)} 下緣`,
        });

        return;
      }

      const price = Number(line.price);
      if (!Number.isFinite(price)) return;

      candleSeries.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: getLineTitle(line),
      });
    });

    ma5Series.setData(showMA5 ? buildMA(5) : []);
    ma20Series.setData(showMA20 ? buildMA(20) : []);
    ma60Series.setData(showMA60 ? buildMA(60) : []);
    bollUpperSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.upper })) : []);
    bollMidSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.mid })) : []);
    bollLowerSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.lower })) : []);
    volumeSeries.setData(volume);

    if (shouldRestoreRange) {
      chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
    } else {
      chart.timeScale().fitContent();

      if (candles.length < 40) {
        chart.timeScale().applyOptions({
          barSpacing: 8,
          rightOffset: 20,
          minBarSpacing: 4,
        });
        chart.timeScale().setVisibleLogicalRange({
          from: -20,
          to: Math.max(40, candles.length + 20),
        });
      }
    }

    const syncOverlay = () => {
      const box = containerRef.current?.getBoundingClientRect();
      if (box) setOverlaySize({ width: Math.max(1, box.width), height: Math.max(1, box.height) });
      setOverlayTick((n) => n + 1);
    };

    const onRangeChange = () => syncOverlay();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      syncOverlay();
    });
    resizeObserver.observe(containerRef.current);
    syncOverlay();

    return () => {
      visibleRangeRef.current = chart.timeScale().getVisibleLogicalRange();
      lastChartKeyRef.current = currentChartKey;
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [stock, showMA5, showMA20, showMA60, showBollinger, chartKey, drawingLines]);

  function getChartPoint(event) {
    const box = overlayRef.current?.getBoundingClientRect();
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!box) return null;

    const x = Math.max(0, Math.min(box.width, event.clientX - box.left));
    const y = Math.max(0, Math.min(box.height, event.clientY - box.top));
    const fallback = {
      x: box.width ? x / box.width : 0,
      y: box.height ? y / box.height : 0,
    };

    const logical = chart?.timeScale?.().coordinateToLogical?.(x);
    const price = candleSeries?.coordinateToPrice?.(y);

    return {
      ...fallback,
      px: x,
      py: y,
      logical: Number.isFinite(logical) ? logical : null,
      price: Number.isFinite(price) ? price : null,
      anchored: Number.isFinite(logical) && Number.isFinite(price),
    };
  }

  function pointToPixel(point) {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (point?.anchored && Number.isFinite(point.logical) && Number.isFinite(point.price)) {
      const x = chart?.timeScale?.().logicalToCoordinate?.(point.logical);
      const y = candleSeries?.priceToCoordinate?.(point.price);

      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }

    return {
      x: (point?.x ?? 0) * overlaySize.width,
      y: (point?.y ?? 0) * overlaySize.height,
    };
  }

  function handlePointerDown(event) {
    if (!drawingEnabled) return;
    const point = getChartPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();

    if (drawingTool === "brush") {
      setDraftDrawing({ id: "draft", tool: "brush", points: [point], anchoredToKline: true });
    } else {
      setDraftDrawing({ id: "draft", tool: drawingTool, start: point, end: point, anchoredToKline: true });
    }
  }

  function handlePointerMove(event) {
    if (!drawingEnabled || !draftDrawing) return;
    const point = getChartPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();

    if (draftDrawing.tool === "brush") {
      setDraftDrawing((prev) => ({ ...prev, points: [...(prev?.points || []), point] }));
    } else {
      setDraftDrawing((prev) => ({ ...prev, end: point }));
    }
  }

  function handlePointerUp(event) {
    if (!drawingEnabled || !draftDrawing) return;
    event.preventDefault();
    event.stopPropagation();

    const completed = { ...draftDrawing, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const startPx = completed.start ? pointToPixel(completed.start) : null;
    const endPx = completed.end ? pointToPixel(completed.end) : null;
    const isValidBrush = completed.tool === "brush" && completed.points?.length >= 2;
    const isValidShape =
      completed.tool !== "brush" &&
      startPx &&
      endPx &&
      (Math.abs(startPx.x - endPx.x) > 4 || Math.abs(startPx.y - endPx.y) > 4);

    if (isValidBrush || isValidShape) onCreateDrawing?.(completed);
    setDraftDrawing(null);
  }

  function renderDrawing(item, isDraft = false) {
    overlayTick;
    const color = item.tool === "rect" ? "#a855f7" : item.tool === "brush" ? "#facc15" : "#38bdf8";
    const strokeWidth = isDraft ? 2.5 : 2;

    if (item.tool === "brush") {
      const points = item.points || [];
      const d = points
        .map((p, i) => {
          const px = pointToPixel(p);
          return `${i === 0 ? "M" : "L"} ${px.x} ${px.y}`;
        })
        .join(" ");

      return (
        <path key={item.id} d={d} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeLinejoin="round" opacity={isDraft ? 0.75 : 0.95}
          vectorEffect="non-scaling-stroke" />
      );
    }

    const start = pointToPixel(item.start);
    const end = pointToPixel(item.end);

    if (item.tool === "rect") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(start.x - end.x);
      const height = Math.abs(start.y - end.y);

      return (
        <rect key={item.id} x={x} y={y} width={width} height={height}
          fill="rgba(168,85,247,.12)" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={isDraft ? "6 4" : "0"} vectorEffect="non-scaling-stroke" />
      );
    }

    return (
      <line key={item.id} x1={start.x} y1={start.y}
        x2={end.x} y2={end.y}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={isDraft ? "6 4" : "0"} vectorEffect="non-scaling-stroke" />
    );
  }

  return (
    <div className={`chart-drawing-wrap ${drawingEnabled ? "drawing-active" : ""}`}>
      <div ref={containerRef} className="trading-chart" />
      <svg
        ref={overlayRef}
        className="chart-free-draw-overlay"
        width={overlaySize.width}
        height={overlaySize.height}
        viewBox={`0 0 ${overlaySize.width} ${overlaySize.height}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {freeDrawings.map((item) => renderDrawing(item))}
        {draftDrawing && renderDrawing(draftDrawing, true)}
      </svg>
    </div>
  );
}



function buildInstitutionalFlow(stock) {
  const symbol = String(stock?.symbol || stock?.stockCode || "").replace(/\.(TW|TWO)$/i, "");
  const seed = Number(symbol.replace(/\D/g, "").slice(-4)) || 2330;
  const change = Number(stock?.changePct || 0);
  const volumeRatio = Number(stock?.volumeRatio || 1);

  // 目前前端沒有穩定法人 API 時，先用量價做估算展示，避免頁面因函式缺失崩潰。
  // 後續若接到真實外資/投信/自營商 API，只要把這裡改成 API 回傳即可。
  const foreignNet = Math.round((change * 120 + (volumeRatio - 1) * 80 + (seed % 97) - 48) * 10);
  const trustNet = Math.round((change * 45 + (seed % 31) - 15) * 6);
  const dealerNet = Math.round((change * 35 + (volumeRatio - 1) * 50 + (seed % 23) - 11) * 5);

  const rows = [
    {
      name: "外資",
      buy: Math.max(0, 1200 + foreignNet),
      sell: Math.max(0, 1200 - foreignNet),
      net: foreignNet,
    },
    {
      name: "投信",
      buy: Math.max(0, 420 + trustNet),
      sell: Math.max(0, 420 - trustNet),
      net: trustNet,
    },
    {
      name: "自營商",
      buy: Math.max(0, 360 + dealerNet),
      sell: Math.max(0, 360 - dealerNet),
      net: dealerNet,
    },
  ];

  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);

  return {
    rows,
    totalNet,
    bias: totalNet > 0 ? "偏多" : totalNet < 0 ? "偏空" : "中性",
  };
}



const conceptMap = {
  AI: ["2382", "3231", "2356", "3017", "3324", "6669", "2376", "2377", "2454", "3443", "3661"],
  ASIC: ["3661", "3443", "3035", "4966", "6531", "2379"],
  IC設計: ["2454", "3034", "6415", "2379", "3443", "5274", "3227", "4966", "6531", "8016", "2401"],
  電源管理: ["6415", "6435", "6651", "3317", "6138", "3588", "8261", "2454", "5299", "4952", "2436", "4923", "6693"],
  高速傳輸: ["3443", "3661", "5269", "4966", "6531", "2379"],
  手機晶片: ["2454", "3034", "3443", "6415", "2379"],
  儲存: ["2408", "2344", "3260", "8299", "6488", "8088"],
  面板: ["2409", "3481", "6116", "2489", "5425"],
  PCB: ["3037", "8046", "3189", "2368", "2383", "6274", "8358"],
  散熱: ["3017", "3324", "2421", "6230", "3653"],
  CPO: ["3234", "3450", "3081", "4979", "3163"],
};

function normalizeGroupName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/業$/g, "")
    .replace(/工業$/g, "")
    .replace(/類$/g, "")
    .replace(/\s+/g, "");
}

function getIndustryKeyFromMaster(master) {
  const industry = normalizeGroupName(master?.officialIndustry || master?.industry || master?.baseType);
  const name = String(master?.stockName || master?.name || "");
  const code = String(master?.stockCode || master?.symbol || "");

  if (conceptMap.面板.includes(code) || /友達|群創|彩晶|面板/.test(name)) return "面板";
  if (conceptMap.PCB.includes(code)) return "PCB";
  if (conceptMap.散熱.includes(code)) return "散熱";
  if (conceptMap.AI.includes(code)) return "AI";
  if (conceptMap.ASIC.includes(code)) return "ASIC";
  if (conceptMap.IC設計.includes(code)) return "IC設計";

  if (industry.includes("半導體")) return "半導體";
  if (industry.includes("電子零組件")) return "電子零組件";
  if (industry.includes("光電")) return "光電";
  if (industry.includes("電腦")) return "電腦週邊";
  if (industry.includes("通信")) return "通信網路";
  if (industry.includes("航運")) return "航運";
  if (industry.includes("金融")) return "金融";
  if (industry.includes("鋼鐵")) return "鋼鐵";
  if (industry.includes("食品")) return "食品";
  if (industry.includes("其他電子")) return "其他電子";

  return industry || "未分類";
}


function resolveGroupStocks(groupName, universeInput = null) {
  const group = String(groupName || "").trim();
  if (!group) return [];

  const universe = universeInput?.length ? universeInput : [];

  const codes = conceptMap?.[group];

  if (Array.isArray(codes)) {
    return universe.filter((stock) =>
      codes.includes(String(stock.stockCode || stock.symbol || "").replace(/\.(TW|TWO)$/i, ""))
    );
  }

  return universe.filter((stock) => {
    const code = String(stock.stockCode || stock.symbol || "").replace(/\.(TW|TWO)$/i, "");
    const official = String(stock.officialIndustry || stock.baseType || "");
    const normalizedOfficial = normalizeGroupName(official);
    const tags = Array.isArray(stock.themeTags) ? stock.themeTags : [];

    return (
      official === group ||
      normalizedOfficial === normalizeGroupName(group) ||
      tags.includes(group) ||
      getIndustryKeyFromMaster(stock) === group ||
      conceptMap?.[group]?.includes(code)
    );
  });
}

function mergeRealtimeQuote(stock, quoteMap = new Map()) {
  const code = String(stock?.stockCode || stock?.symbol || "").replace(/\.(TW|TWO)$/i, "");
  const quote = quoteMap instanceof Map ? quoteMap.get(code) : null;

  return {
    ...stock,
    ...(quote || {}),
    symbol: code,
    stockCode: code,
    name: stock?.stockName || stock?.name || quote?.name || code,
    stockName: stock?.stockName || stock?.name || quote?.name || code,
    officialIndustry: stock?.officialIndustry || quote?.officialIndustry || "未分類產業",
    themeTags: stock?.themeTags || quote?.themeTags || [],
  };
}

function getMasterByCode(code) {
  const key = String(code || "").trim().toUpperCase().replace(/\.(TW|TWO)$/i, "");
  if (!key) return null;



  if (typeof STOCK_MASTER_ALL !== "undefined") {
    const fromMaster = STOCK_MASTER_ALL.find((item) => String(item.stockCode).toUpperCase() === key);
    if (fromMaster) return fromMaster;
  }

  return null;
}

function isCommonTaiwanStock(stock) {
  if (!stock) return false;
  const code = String(stock.stockCode || stock.symbol || "").replace(/\.(TW|TWO)$/i, "");
  if (!/^\d{4}$/.test(code)) return false;
  if (stock.isETF || stock.isWarrant) return false;

  const name = String(stock.stockName || stock.name || "");
  if (/ETF|ETN|權證|牛|熊|特別股|受益|存託/i.test(name)) return false;

  return true;
}

function getStockProfile(stock) {
  const code = String(stock?.symbol || stock?.stockCode || "").replace(/\.(TW|TWO)$/i, "");
  const info = null; // 產業資訊由 Yahoo meta 提供

  const industry =
    stock?.officialIndustry ||
    stock?.baseType ||
    info?.officialIndustry ||
    info?.industry ||
    "未分類產業";

  const products =
    stock?.mainProducts ||
    info?.mainProducts ||
    info?.business ||
    (Array.isArray(info?.themeTags) && info.themeTags.length
      ? info.themeTags.join("、")
      : "主要業務資料尚未完整建檔，可先依產業分類、K線、量價與法人籌碼綜合判斷。");

  return {
    code,
    name: stock?.name || info?.stockName || code,
    industry,
    products,
    market: stock?.market || info?.market || "台股",
    themeTags: stock?.themeTags || info?.themeTags || [],
  };
}


// 自選股分組設定
// 若你的舊版 Stock.jsx 有使用 FAVORITE_GROUPS，但新拆檔時沒有帶到，就會造成頁面黑屏。
const FAVORITE_GROUPS = ["選單1", "選單2", "選單3", "選單4", "選單5"];

const DEFAULT_FAVORITE_GROUP = FAVORITE_GROUPS[0];

// ─── 股市新聞 Tab 組件 ──────────────────────────────────────────────────────
function NewsTab({ API_BASE }) {
  const [newsMap, setNewsMap] = useState({});
  const [loading, setLoading] = useState(false);

  const WATCH_SYMBOLS = [
    { symbol: "^TWII", name: "台灣加權指數" },
    { symbol: "2330",  name: "台積電" },
    { symbol: "2317",  name: "鴻海" },
    { symbol: "2454",  name: "聯發科" },
    { symbol: "NVDA",  name: "輝達" },
    { symbol: "AAPL",  name: "蘋果" },
  ];

  useEffect(() => {
    setLoading(true);
    Promise.all(
      WATCH_SYMBOLS.map(({ symbol, name }) =>
        fetch(`${API_BASE}/api/news/${encodeURIComponent(symbol)}?name=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .catch(() => ({ symbol, articles: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.symbol] = r.articles || []; });
      setNewsMap(map);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "#8fafc8" }}>
      📰 新聞載入中...
    </div>
  );

  return (
    <div className="report-card">
      <div className="section-title" style={{ marginBottom: 16 }}>
        <h2>📰 股市新聞</h2>
        <span className="muted">台股 ＋ 美股即時新聞</span>
      </div>
      <div className="news-tab-grid">
        {WATCH_SYMBOLS.map(({ symbol, name }) => {
          const articles = newsMap[symbol] || [];
          return (
            <div key={symbol} className="news-tab-card">
              <div className="news-tab-card-title">
                {name} <span style={{ color: "#8fafc8", fontSize: 12 }}>{symbol}</span>
              </div>
              {articles.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>暫無新聞</div>
              ) : (
                articles.slice(0, 4).map((a, idx) => {
                  const ts = a.providerPublishTime;
                  const timeStr = ts
                    ? new Date(ts * 1000).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : "";
                  return (
                    <div key={idx} className="news-tab-item">
                      <a href={a.url || a.link} target="_blank" rel="noopener noreferrer">
                        <div className="news-item-title">{a.title}</div>
                        {a.snippet && (
                          <div className="news-item-snippet" style={{fontSize:11,color:"#8fafc8",marginBottom:3}}>{a.snippet.slice(0,60)}...</div>
                        )}
                        <div className="news-item-meta">
                          {a.publisher && <span>{a.publisher}</span>}
                          {timeStr && <span>{timeStr}</span>}
                        </div>
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Stock() {
  const navigate = useNavigate();
  const { symbol } = useParams();
  const [query, setQuery] = useState(symbol || "2330");

  const [favorites, setFavorites] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("stockRadarFavorites") || "[]");
  } catch {
    return [];
  }
});

useEffect(() => {
  // 舊版 twStockNames OpenAPI 已停用，避免 CORS 造成分頁黑屏。
  // 股票名稱改由 stockUniverse / Yahoo K線資料流程處理。
}, []);

const [watchText, setWatchText] = useState(() => {
  const savedWatchText = localStorage.getItem("stockRadarWatchText");

  if (savedWatchText && savedWatchText.trim()) {
    return savedWatchText;
  }

  try {
    const savedFavorites = JSON.parse(localStorage.getItem("stockRadarFavorites") || "[]");
    const symbols = savedFavorites
      .map((item) => item.symbol)
      .filter(Boolean);

    if (symbols.length) {
      return [...new Set(symbols)].join(",");
    }
  } catch {
    //
  }

  return "2330,2317,2454,2308,2382,0050,AAPL,NVDA,TSLA,SPY,QQQ";
 });

  const [range, setRange] = useState("1y");
  const [stock, setStock] = useState(null);
  const [stockUniverse, setStockUniverse] = useState([]);
  const [watchList, setWatchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [error, setError] = useState("");
  const [rightView, setRightView] = useState("ai");
  const [newsData, setNewsData] = useState({});      // { symbol: { articles, updatedAt, loading } }
  const [watchMenuOpen, setWatchMenuOpen] = useState(false);
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [activeMenu, setActiveMenu] = useState("report");
  const menuHistoryRef = useRef([]);
  const lastMenuRef = useRef("report");
  const [sortMode, setSortMode] = useState("score");
  const [intradayInterval, setIntradayInterval] = useState("1m");
  const [klineType, setKlineType] = useState("1d");
  const [intradayStock, setIntradayStock] = useState(null);
  const [dayTradeList, setDayTradeList] = useState([]);
  const [dayTradeLoading, setDayTradeLoading] = useState(false);
  const [showMA5, setShowMA5] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA60, setShowMA60] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarSearchHistory") || "[]");
    } catch {
      return [];
    }
  });
  const [realtimeDayTrade, setRealtimeDayTrade] = useState(false);
  const [systemStrongList, setSystemStrongList] = useState([]);
  const [systemStrongLoading, setSystemStrongLoading] = useState(false);
  const [klineRadarList, setKlineRadarList] = useState([]);
  const [klineRadarLoading, setKlineRadarLoading] = useState(false);
  const [klineRadarSort, setKlineRadarSort] = useState("score");
  const [marketBreadthList, setMarketBreadthList] = useState([]);
  const [marketBreadthUpdatedAt, setMarketBreadthUpdatedAt] = useState(null);
  const [taiwanMarketIndex, setTaiwanMarketIndex] = useState(null);
  const [taiwanMarketUpdatedAt, setTaiwanMarketUpdatedAt] = useState(null);
  const [strongCategory, setStrongCategory] = useState("全部");
  const [favoritePickerStock, setFavoritePickerStock] = useState(null);
  const [favoriteGroupFilter, setFavoriteGroupFilter] = useState("全部");
  const [nextDayList, setNextDayList] = useState([]);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [nextDaySortMode, setNextDaySortMode] = useState("score");
  const [reportTab, setReportTab] = useState("market");
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  useEffect(() => {
    // 每 9 分鐘 ping 後端，防止 Render 免費方案冷啟動
    const keepAliveInterval = setInterval(() => {
      fetch(`${API_BASE}/`).catch(() => {});
    }, 9 * 60 * 1000);

    return () => clearInterval(keepAliveInterval);
  }, []);

  // 切換頁面時自動執行掃描（不需要手動點立即刷新）
  useEffect(() => {
    if (activeMenu === "nextday") {
      if (!nextDayLoading) scanNextDayList();
    } else if (activeMenu === "strong") {
      if (!systemStrongLoading) scanSystemStrongStocks({ silent: false });
    } else if (activeMenu === "klineradar") {
      if (!klineRadarLoading) scanKlineRadar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);
  const [selectedGroupQuotes, setSelectedGroupQuotes] = useState({});
  const [chartLines, setChartLines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarChartLines") || "{}");
    } catch {
      return {};
    }
  });
  const [linePrice, setLinePrice] = useState("");
  const [lineLabel, setLineLabel] = useState("");
  const [lineType, setLineType] = useState("resistance");
  const [drawingKind, setDrawingKind] = useState("horizontal");
  const [trendStartBarsAgo, setTrendStartBarsAgo] = useState("20");
  const [trendEndBarsAgo, setTrendEndBarsAgo] = useState("0");
  const [trendStartPrice, setTrendStartPrice] = useState("");
  const [trendEndPrice, setTrendEndPrice] = useState("");
  const [zoneTopPrice, setZoneTopPrice] = useState("");
  const [zoneBottomPrice, setZoneBottomPrice] = useState("");
  const [freeDrawings, setFreeDrawings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarFreeDrawings") || "{}");
    } catch {
      return {};
    }
  });
  const [freeDrawingEnabled, setFreeDrawingEnabled] = useState(false);
  const [freeDrawingTool, setFreeDrawingTool] = useState("line");

  useEffect(() => {
    localStorage.setItem("stockRadarWatchText", watchText);
  }, [watchText]);

  useEffect(() => {
    localStorage.setItem("stockRadarFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("stockRadarSearchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    if (lastMenuRef.current !== activeMenu) {
      menuHistoryRef.current.push(lastMenuRef.current);
      lastMenuRef.current = activeMenu;
    }
  }, [activeMenu]);

  function goBackToPreviousView() {
    const previousMenu = menuHistoryRef.current.pop();

    if (previousMenu) {
      lastMenuRef.current = previousMenu;
      setActiveMenu(previousMenu);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  }

  useEffect(() => {
    localStorage.setItem("stockRadarChartLines", JSON.stringify(chartLines));
  }, [chartLines]);

  useEffect(() => {
    localStorage.setItem("stockRadarFreeDrawings", JSON.stringify(freeDrawings));
  }, [freeDrawings]);

  useEffect(() => {
    setFavoritePickerStock(null);
  }, [stock?.symbol, activeMenu]);


  function getChartLineKey(targetStock = stock) {
    const symbol = targetStock?.symbol || query || "default";
    return `${symbol}-${klineType}`;
  }

  function getDrawingLines(targetStock = stock) {
    return chartLines[getChartLineKey(targetStock)] || [];
  }

  function addChartLine(targetStock = stock) {
    if (!targetStock?.symbol) {
      setError("請先選擇股票後再新增畫線");
      return;
    }

    const key = getChartLineKey(targetStock);
    const baseLabel = lineLabel.trim();

    let newLine = null;

    if (drawingKind === "trend") {
      const startBarsAgo = Number(trendStartBarsAgo);
      const endBarsAgo = Number(trendEndBarsAgo);
      const startPrice = Number(trendStartPrice);
      const endPrice = Number(trendEndPrice);

      if (
        !Number.isFinite(startBarsAgo) ||
        !Number.isFinite(endBarsAgo) ||
        !Number.isFinite(startPrice) ||
        !Number.isFinite(endPrice) ||
        startPrice <= 0 ||
        endPrice <= 0
      ) {
        setError("請輸入有效的趨勢線起點 / 終點資料");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "trend",
        type: "trend",
        startBarsAgo,
        endBarsAgo,
        startPrice,
        endPrice,
        label: baseLabel || "趨勢線",
      };
    } else if (drawingKind === "zone") {
      const top = Number(zoneTopPrice);
      const bottom = Number(zoneBottomPrice);

      if (!Number.isFinite(top) || !Number.isFinite(bottom) || top <= 0 || bottom <= 0) {
        setError("請輸入有效的區間上緣 / 下緣價格");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "zone",
        type: "zone",
        top,
        bottom,
        label: baseLabel || "價格區間",
      };
    } else {
      const price = Number(linePrice || targetStock?.close);

      if (!Number.isFinite(price) || price <= 0) {
        setError("請輸入有效價格");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "horizontal",
        price,
        type: lineType,
        label:
          baseLabel ||
          (lineType === "support"
            ? "支撐"
            : lineType === "stop"
            ? "停損"
            : "壓力"),
      };
    }

    setChartLines((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newLine],
    }));

    setLinePrice("");
    setLineLabel("");
    setTrendStartPrice("");
    setTrendEndPrice("");
    setZoneTopPrice("");
    setZoneBottomPrice("");
  }

  function deleteChartLine(targetStock, lineId) {
    const key = getChartLineKey(targetStock);

    setChartLines((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((line) => line.id !== lineId),
    }));
  }

  function clearChartLines(targetStock = stock) {
    const key = getChartLineKey(targetStock);

    setChartLines((prev) => ({
      ...prev,
      [key]: [],
    }));
  }


  function getFreeDrawings(targetStock = stock) {
    return freeDrawings[getChartLineKey(targetStock)] || [];
  }

  function addFreeDrawing(targetStock = stock, drawing) {
    if (!targetStock?.symbol || !drawing) return;
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), drawing],
    }));
  }

  function deleteFreeDrawing(targetStock, drawingId) {
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.id !== drawingId),
    }));
  }

  function clearFreeDrawings(targetStock = stock) {
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({ ...prev, [key]: [] }));
  }

  function DrawingTools({ targetStock }) {
    const lines = getDrawingLines(targetStock);

    const fillCurrentPrice = () => {
      const value = targetStock?.close?.toFixed?.(2) || "";
      if (drawingKind === "horizontal") setLinePrice(value);
      if (drawingKind === "trend") {
        setTrendEndPrice(value);
        if (!trendStartPrice) setTrendStartPrice(value);
      }
      if (drawingKind === "zone") {
        setZoneTopPrice(value);
        if (!zoneBottomPrice) setZoneBottomPrice(value);
      }
    };

    const describeLine = (line) => {
      const kind = line.kind || "horizontal";

      if (kind === "trend") {
        return `${line.label || "趨勢線"}｜${line.startBarsAgo}根前 ${Number(line.startPrice).toFixed(2)} → ${line.endBarsAgo}根前 ${Number(line.endPrice).toFixed(2)}`;
      }

      if (kind === "zone") {
        return `${line.label || "價格區間"}｜${Number(Math.max(line.top, line.bottom)).toFixed(2)} ~ ${Number(Math.min(line.top, line.bottom)).toFixed(2)}`;
      }

      return `${line.label || "水平線"} ${Number(line.price).toFixed(2)}`;
    };

    return (
      <div className="drawing-panel">
        <div className="drawing-title">
          <b>✏️ K線畫線 v3</b>
          <span>水平線 / 趨勢線 / 區間 / 滑鼠自由畫</span>
        </div>

        <div className="drawing-mode-tabs">
          <button
            className={drawingKind === "horizontal" ? "active" : "ghost"}
            onClick={() => setDrawingKind("horizontal")}
          >
            水平線
          </button>
          <button
            className={drawingKind === "trend" ? "active" : "ghost"}
            onClick={() => setDrawingKind("trend")}
          >
            趨勢線
          </button>
          <button
            className={drawingKind === "zone" ? "active" : "ghost"}
            onClick={() => setDrawingKind("zone")}
          >
            區間
          </button>
        </div>

        {drawingKind === "horizontal" && (
          <div className="drawing-row">
            <select
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
              style={{ width: 100 }}
            >
              <option value="resistance">壓力</option>
              <option value="support">支撐</option>
              <option value="stop">停損</option>
            </select>

            <input
              value={linePrice}
              onChange={(e) => setLinePrice(e.target.value)}
              placeholder={`價格，例如 ${targetStock?.close?.toFixed?.(2) || ""}`}
              style={{ width: 150 }}
            />

            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，可空白"
              style={{ width: 150 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增水平線
            </button>
          </div>
        )}

        {drawingKind === "trend" && (
          <div className="drawing-row">
            <input
              value={trendStartBarsAgo}
              onChange={(e) => setTrendStartBarsAgo(e.target.value)}
              placeholder="起點：幾根前"
              style={{ width: 120 }}
            />
            <input
              value={trendStartPrice}
              onChange={(e) => setTrendStartPrice(e.target.value)}
              placeholder="起點價格"
              style={{ width: 120 }}
            />
            <input
              value={trendEndBarsAgo}
              onChange={(e) => setTrendEndBarsAgo(e.target.value)}
              placeholder="終點：幾根前"
              style={{ width: 120 }}
            />
            <input
              value={trendEndPrice}
              onChange={(e) => setTrendEndPrice(e.target.value)}
              placeholder="終點價格"
              style={{ width: 120 }}
            />
            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，可空白"
              style={{ width: 150 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增趨勢線
            </button>
          </div>
        )}

        {drawingKind === "zone" && (
          <div className="drawing-row">
            <input
              value={zoneTopPrice}
              onChange={(e) => setZoneTopPrice(e.target.value)}
              placeholder="上緣價格"
              style={{ width: 130 }}
            />
            <input
              value={zoneBottomPrice}
              onChange={(e) => setZoneBottomPrice(e.target.value)}
              placeholder="下緣價格"
              style={{ width: 130 }}
            />
            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，例如壓力區"
              style={{ width: 160 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增區間
            </button>
          </div>
        )}

        <div className="drawing-free-box">
          <div className="drawing-title" style={{ marginBottom: 6 }}>
            <b>🖱️ 滑鼠自由畫</b>
            <span>開啟後可直接在K線圖上拖曳畫線</span>
          </div>

          <div className="drawing-row">
            <button className={freeDrawingEnabled ? "danger" : "ghost"} onClick={() => setFreeDrawingEnabled((v) => !v)}>
              {freeDrawingEnabled ? "停止自由畫" : "啟動自由畫"}
            </button>

            <select value={freeDrawingTool} onChange={(e) => setFreeDrawingTool(e.target.value)} style={{ width: 130 }}>
              <option value="line">直線</option>
              <option value="brush">手繪線</option>
              <option value="rect">矩形區域</option>
            </select>

            <button className="danger" onClick={() => clearFreeDrawings(targetStock)} disabled={!getFreeDrawings(targetStock).length}>
              清空自由畫
            </button>

            <span className="muted">
              自由畫模式開啟時，拖曳圖表會變成畫線；要縮放/移動K線請先停止自由畫。
            </span>
          </div>
        </div>

        <div className="drawing-row" style={{ marginTop: 8 }}>
          <button className="danger" onClick={() => clearChartLines(targetStock)} disabled={!lines.length}>
            清空水平/趨勢/區間
          </button>
          <span className="muted">
            趨勢線用「幾根前」定位：0 = 最新K棒，20 = 往前第20根。
          </span>
        </div>

        {lines.length > 0 && (
          <div className="drawing-list">
            {lines.map((line) => (
              <span className={`drawing-chip ${line.type || line.kind}`} key={line.id}>
                {describeLine(line)}
                <button onClick={() => deleteChartLine(targetStock, line.id)}>×</button>
              </span>
            ))}
          </div>
        )}

        {getFreeDrawings(targetStock).length > 0 && (
          <div className="drawing-list">
            {getFreeDrawings(targetStock).map((item, index) => (
              <span className={`drawing-chip ${item.tool}`} key={item.id}>
                自由畫{index + 1}｜{item.tool === "rect" ? "矩形" : item.tool === "brush" ? "手繪" : "直線"}
                <button onClick={() => deleteFreeDrawing(targetStock, item.id)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  function rememberSearchKeyword(value) {
    const keyword = String(value || "").trim().toUpperCase();
    if (!keyword) return;
    setSearchHistory((prev) => {
      const next = [keyword, ...prev.filter((item) => item !== keyword)];
      return next.slice(0, 10);
    });
  }


  function getWatchSymbols(textValue = watchText) {
    return [
      ...new Set(
        String(textValue || "")
          .split(/[ ,，\n]+/)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean)
      ),
    ];
  }

  async function fetchAndUpsertWatchStock(symbol) {
    const target = String(symbol || "").trim().toUpperCase();
    if (!target) return null;

    try {
      const request = getKlineRequest(klineType, range);
      const data = await fetchYahooHistory(target, request.range, request.interval);
      const analyzed = analyzeStock(data);

      setWatchList((prev) => {
        const exists = prev.some((item) => item.symbol === analyzed.symbol);
        if (exists) {
          return prev.map((item) =>
            item.symbol === analyzed.symbol ? analyzed : item
          );
        }
        return [analyzed, ...prev];
      });

      if (!stock || stock.symbol === analyzed.symbol) {
        setStock(analyzed);
      }

      return analyzed;
    } catch (err) {
      console.warn("fetch watch stock failed", target, err);
      setError(err.message || `${target} 資料抓取失敗`);
      return null;
    }
  }

  function addFavorite(targetStock = stock, group = "選單1") {
    if (!targetStock?.symbol) {
      setFavoriteNotice("請先查詢股票，再加入收藏");
      return;
    }

    const targetSymbol = String(targetStock.symbol).toUpperCase();
    const targetGroup = group || "選單1";

    setFavorites((prev) => {
      const exists = prev.some(
        (item) => item.symbol === targetSymbol && (item.group || "選單1") === targetGroup
      );

      if (exists) {
        setFavoriteNotice(`${targetSymbol} 已在${targetGroup}`);
        return prev;
      }

      setFavoriteNotice(`已收藏 ${targetSymbol} 到${targetGroup}`);
      return [
        ...prev,
        {
          symbol: targetSymbol,
          name: targetStock.name,
          group: targetGroup,
        },
      ];
    });

    setWatchText((prev) => {
      const items = getWatchSymbols(prev);

      if (items.includes(targetSymbol)) return prev;
      return [...items, targetSymbol].join(",");
    });

    fetchAndUpsertWatchStock(targetSymbol);
    setFavoritePickerStock(null);
  }

  function removeFavorite(symbol, group = null) {
    setFavorites((prev) =>
      prev.filter((item) =>
        group ? !(item.symbol === symbol && (item.group || "選單1") === group) : item.symbol !== symbol
      )
    );
    setFavoriteNotice(`已移除 ${symbol}`);
  }

  function removeWatchSymbol(symbol) {
  const target = String(symbol).toUpperCase();

  setWatchText((prev) =>
    prev
      .split(/[ ,，\n]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => item !== target)
      .join(",")
  );

  setWatchList((prev) =>
    prev.filter((item) => item.symbol.toUpperCase() !== target)
  );
}

  async function addWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;

    const items = getWatchSymbols(watchText);

    if (!items.includes(value)) {
      setWatchText([...items, value].join(","));
    }

    setFavorites((prev) => {
      const exists = prev.some((item) => item.symbol === value);
      if (exists) return prev;

      return [
        ...prev,
        {
          symbol: value,
          name: value,
          group: favoriteGroupFilter === "全部" ? "選單1" : favoriteGroupFilter,
        },
      ];
    });

    setFavoriteNotice(`已加入 ${value}，正在更新資料`);
    setNewWatchSymbol("");
    setWatchMenuOpen(false);

    await fetchAndUpsertWatchStock(value);
  }

  function removeSelectedWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;
    const items = watchText
      .split(/[ ,，\n]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => item !== value);

    setWatchText(items.join(","));
    setNewWatchSymbol("");
    setWatchMenuOpen(false);
  }


  async function changeKlineType(nextType, target = query) {
    setKlineType(nextType);

    if (["1m", "5m", "30m"].includes(nextType)) {
      setIntradayInterval(nextType);
    }

    const symbolToLoad = String(target || stock?.symbol || query || "").trim();
    if (!symbolToLoad) return;

    setLoading(true);
    setError("");

    try {
      const request = getKlineRequest(nextType, range);
      const data = await fetchYahooHistory(symbolToLoad, request.range, request.interval);
      const analyzed = analyzeStock(data);

      setStock(analyzed);

      if (activeMenu === "daytrade") {
        setIntradayStock(analyzed);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "K線切換失敗");
    } finally {
      setLoading(false);
    }
  }

  async function ensureStockUniverseReady() {
    return [];
  }

  async function searchOne(input = query) {
    const rawInput = String(input || "").trim();
    if (!rawInput) return;

    setLoading(true);
    setError("");

    try {
      const target = resolveSymbol(rawInput);
      setQuery(target || rawInput);
      rememberSearchKeyword(rawInput);

      const data = await fetchYahooHistory(target || rawInput, range, "1d");
      const analyzed = analyzeStock(data);

      // analyzed.name 如果已是中文（fetchYahooHistory 從 meta.shortName 取到）就直接用
      // 否則問後端 /api/yahoo/name/:symbol，後端會去 Yahoo chart 取 meta 並回傳
      const nameIsCode = !analyzed.name || analyzed.name === analyzed.symbol || !/[一-鿿]/.test(analyzed.name);
      const displayName = nameIsCode ? await fetchAndCacheName(analyzed.symbol) : analyzed.name;
      const stockIndustry = getIndustry(analyzed.symbol);
      setStock({ ...analyzed, name: displayName, officialIndustry: stockIndustry || analyzed.officialIndustry });
      setQuery(analyzed.symbol || target || rawInput);
      setActiveMenu("analysis");
    } catch (err) {
      console.error(err);
      setError(err.message || "查詢失敗");
    } finally {
      setLoading(false);
    }
  }
  async function openStockAnalysisFromList(item) {
    if (!item) return;

    const target = String(item.symbol || item.stockCode || item.code || "").trim();
    if (!target) return;

    setQuery(target);
    rememberSearchKeyword(target);
    setActiveMenu("analysis");
    setLoading(true);
    setError("");

    try {
      const request = getKlineRequest(klineType, range);
      const safeRequest =
        request.interval === "1d" && ["1d", "5d"].includes(request.range)
          ? { range: range || "1y", interval: "1d" }
          : request;

      const data = await fetchYahooHistory(target, safeRequest.range, safeRequest.interval);
      const analyzed = analyzeStock(data);

      const nameIsCode2 = !analyzed.name || analyzed.name === analyzed.symbol || !/[一-鿿]/.test(analyzed.name);
      const displayName = nameIsCode2 ? (item.name || await fetchAndCacheName(analyzed.symbol)) : analyzed.name;

      const stockIndustry2 = getIndustry(analyzed.symbol);
      setStock({
        ...analyzed,
        name: displayName,
        baseType: item.baseType || stockIndustry2 || analyzed.baseType,
        officialIndustry: item.officialIndustry || stockIndustry2 || analyzed.officialIndustry,
      });
    } catch (err) {
      console.warn("openStockAnalysisFromList failed", target, err);
      setStock(item);
      setError(err.message || "股票完整K線載入失敗，暫時顯示清單快取資料");
    } finally {
      setLoading(false);
    }
  }

  async function scanWatchList(options = {}) {
    const { silent = false } = options;

    if (!silent) setScanning(true);
    setError("");

    try {
      const items = getWatchSymbols(watchText).slice(0, 30);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, range, "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const poolItem = MARKET_STRONG_POOL.find(p => p.symbol === item);
                return { ...analyzed, name: cleanStockName(poolItem?.name || analyzed.name || "") };
              })
              .catch((err) => {
                console.warn("watch scan failed", item, err);
                return null;
              })
          )
        )
      ).filter(Boolean);

      setWatchList(result);
      if (!silent && !stock && result[0]) setStock(result[0]);
      if (!silent) setActiveMenu("watchlist");
    } catch (err) {
      setError(err.message || "自選清單掃描失敗");
    } finally {
      if (!silent) setScanning(false);
    }
  }

  async function searchIntraday(input = query, silent = false) {
    const target = String(input || "").trim();
    if (!target) return;
    if (!silent) setDayTradeLoading(true);
    setError("");
    try {
      // Yahoo 分K用 5d 比 1d 穩定，避免台股只回傳單根K棒。
      const request = getKlineRequest(klineType, range);
      const data = await fetchYahooHistory(target, request.range, request.interval);
      const analyzed = analyzeStock(data);
      setIntradayStock(analyzed);
      setStock(analyzed);
      setQuery(target);
      rememberSearchKeyword(target);
    } catch (err) {
      console.error(err);
      if (!silent) setError(err.message || "分K資料抓取失敗");
    } finally {
      if (!silent) setDayTradeLoading(false);
    }
  }

  async function scanDayTradeList() {
    setDayTradeLoading(true);
    setError("");
    try {
      const items = watchText
        .split(/[ ,，\n]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 30);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, "5d", intradayInterval)
              .then((data) => analyzeStock(data))
              .catch((err) => {
                console.warn("daytrade scan failed", item, err);
                return null;
              })
          )
        )
      ).filter(Boolean);

      result.sort((a, b) => (b.dayTrade?.score || 0) - (a.dayTrade?.score || 0));
      setDayTradeList(result);
      if (result[0]) {
        setIntradayStock(result[0]);
        setStock(result[0]);
      }
    } catch (err) {
      setError(err.message || "當沖掃描失敗");
    } finally {
      setDayTradeLoading(false);
    }
  }

  async function scanKlineRadar({ silent = false } = {}) {
    if (!silent) setKlineRadarLoading(true);
    if (!silent) setError("");

    try {
      const universeMap = new Map();

      [...(typeof STOCK_MASTER_ALL !== "undefined" ? STOCK_MASTER_ALL : []), ...MARKET_STRONG_POOL]
        .filter(Boolean)
        .forEach((item) => {
          const symbol = item.stockCode || item.symbol;
          if (!symbol || !/^\d{4}$/.test(String(symbol))) return;
          universeMap.set(symbol, {
            symbol,
            baseType: item.officialIndustry || item.baseType || item.subIndustry || "台股",
            name: item.stockName || item.name,
          });
        });

      const universe = [...universeMap.values()].slice(0, 180);

      const result = (
        await Promise.all(
          universe.map((item) =>
            fetchYahooHistory(item.symbol, "6mo", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const radar = buildKlineRadarSignal(analyzed);

                return {
                  ...analyzed,
                  baseType: item.industry || item.baseType,
                  name: item.name || analyzed.name,
                  ...radar,
                };
              })
              .catch((err) => {
                console.warn("kline radar scan failed", item.symbol, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .filter((item) => {
          const hasVolume = (item.volumeRatio || 0) >= 1.2 || item.volumeTitle?.includes("放大") || item.volumeTitle?.includes("爆量");
          const hasKline = (item.bullishSignals?.length || 0) > 0 || (item.bearishSignals?.length || 0) > 0 || item.nearBreakout;
          return (item.radarScore >= 45 || item.bullishScore >= 55 || item.bearishScore >= 60) && (hasVolume || hasKline);
        })
        .sort((a, b) => b.radarScore - a.radarScore)
        .slice(0, 80);

      setKlineRadarList(result);
    } catch (err) {
      setError(err.message || "K線訊號雷達掃描失敗");
    } finally {
      setKlineRadarLoading(false);
    }
  }

  async function scanSystemStrongStocks({ silent = false } = {}) {
    if (!silent) setSystemStrongLoading(true);
    if (!silent) setError("");

    try {
      const result = (
        await Promise.all(
          MARKET_STRONG_POOL.map((item) =>
            fetchYahooHistory(item.symbol, "5d", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const recent = calcRecent3DayStrength(analyzed);

                return {
                  ...analyzed,
                  name: cleanStockName(item.name || analyzed.name || ""),  // 清理公司名後綴
                  baseType: item.industry || item.baseType,
                  strongType: classifyStrongStock({
                    ...analyzed,
                    baseType: item.industry || item.baseType,
                  }),
                  ...recent,
                };
              })
              .catch((err) => {
                console.warn("system strong scan failed", item.symbol, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .filter((item) => item.currency !== "USD")
        .sort((a, b) => {
          const aScore = (a.recent3DayScore || 0) * 0.65 + (a.score || 0) * 0.35;
          const bScore = (b.recent3DayScore || 0) * 0.65 + (b.score || 0) * 0.35;
          return bScore - aScore;
        })
        .slice(0, 50);

      setSystemStrongList(result);
    } catch (err) {
      setError(err.message || "系統強勢股掃描失敗");
    } finally {
      setSystemStrongLoading(false);
    }
  }


  async function scanTaiwanMarketIndex(options = {}) {
    const { silent = true } = options;

    try {
      const data = await fetchYahooHistory("^TWII", "5d", "1d");
      const analyzed = analyzeStock({
        ...data,
        symbol: "^TWII",
        name: "台灣加權指數",
      });

      setTaiwanMarketIndex(analyzed);
      setTaiwanMarketUpdatedAt(new Date());
    } catch (err) {
      console.warn("taiwan market index scan failed", err);
      if (!silent) setError(err.message || "台股加權指數抓取失敗");
    }
  }

  async function scanMarketBreadth(options = {}) {
    const { silent = true } = options;

    try {
      const result = (
        await Promise.all(
          MARKET_STRONG_POOL.map((item) =>
            fetchYahooHistory(item.symbol, "5d", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                return {
                  ...analyzed,
                  name: cleanStockName(item.name || analyzed.name || ""),
                  baseType: item.industry || item.baseType,
                };
              })
              .catch((err) => {
                console.warn("market breadth scan failed", item.symbol, err);
                return null;
              })
          )
        )
      ).filter((item) => item && item.currency !== "USD");

      setMarketBreadthList(result);
      setMarketBreadthUpdatedAt(new Date());
    } catch (err) {
      if (!silent) setError(err.message || "台股大盤方向資料抓取失敗");
    }
  }

  async function scanNextDayList(options = {}) {
    const { silent = false } = options;

    if (!silent) setNextDayLoading(true);
    setError("");

    try {
      const items = MARKET_STRONG_POOL.map((item) => item.symbol).slice(0, 80);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, range, "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const poolItem = MARKET_STRONG_POOL.find(p => p.symbol === item);
                return { ...analyzed, name: cleanStockName(poolItem?.name || analyzed.name || "") };
              })
              .catch((err) => {
                console.warn("next day scan failed", item, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .sort((a, b) => {
          const aScore = a.nextDay?.nextDayScore || 0;
          const bScore = b.nextDay?.nextDayScore || 0;
          return bScore - aScore;
        });

      setNextDayList(result);
      if (!silent && !stock && result[0]) setStock(result[0]);
    } catch (err) {
      if (!silent) setError(err.message || "隔日沖選股失敗");
    } finally {
      if (!silent) setNextDayLoading(false);
    }
  }

  useEffect(() => {
    if (symbol) searchOne(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // 當股票變更時自動抓新聞（只在 AI tab 顯示，且不重複抓）
  useEffect(() => {
    if (!stock?.symbol) return;
    const sym = stock.symbol;
    const existing = newsData[sym];
    if (existing && (existing.loading || Date.now() - existing.updatedAt < 10 * 60 * 1000)) return;

    setNewsData(prev => ({ ...prev, [sym]: { articles: [], loading: true, updatedAt: 0 } }));
    const stockName = encodeURIComponent(stock?.name || "");
    fetch(`${API_BASE}/api/news/${encodeURIComponent(sym)}?name=${stockName}`)
      .then(r => r.json())
      .then(data => {
        setNewsData(prev => ({
          ...prev,
          [sym]: { articles: data.articles || [], loading: false, updatedAt: data.updatedAt || Date.now() }
        }));
      })
      .catch(() => {
        setNewsData(prev => ({ ...prev, [sym]: { articles: [], loading: false, updatedAt: Date.now() } }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock?.symbol]);

  useEffect(() => {
    let cancelled = false;

    async function loadTaiwanMarketIndexInBackground() {
      if (cancelled) return;
      // 每日報告「今日大盤方向」使用台灣加權指數，不用自選清單。
      await scanTaiwanMarketIndex({ silent: true });
    }

    loadTaiwanMarketIndexInBackground();

    const timer = setInterval(() => {
      loadTaiwanMarketIndexInBackground();
    }, 180000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketBreadthInBackground() {
      if (cancelled) return;
      // 這裡抓的是台股市場池，不使用自選股，避免每日報告的大盤方向被自選清單影響。
      await scanMarketBreadth({ silent: true });
    }

    loadMarketBreadthInBackground();

    const timer = setInterval(() => {
      loadMarketBreadthInBackground();
    }, 180000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSystemStrongInBackground() {
      if (cancelled) return;
      await scanSystemStrongStocks({ silent: true });
    }

    loadSystemStrongInBackground();

    // 每 5 分鐘重新掃描，確保資料是最新的
    const timer = setInterval(() => {
      loadSystemStrongInBackground();
    }, 300000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const items = getWatchSymbols(watchText);
    if (!items.length) return;

    let cancelled = false;

    async function loadWatchListInBackground() {
      if (cancelled) return;
      // 背景更新只刷新清單，不切換目前分析看板的股票。
      await scanWatchList({ silent: true });
    }

    loadWatchListInBackground();

    const timer = setInterval(() => {
      loadWatchListInBackground();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchText, range]);

  useEffect(() => {
    let cancelled = false;

    async function loadNextDayInBackground() {
      if (cancelled) return;
      // 背景更新只刷新隔日沖清單，不切換目前分析看板的股票。
      await scanNextDayList({ silent: true });
    }

    loadNextDayInBackground();

    const timer = setInterval(() => {
      loadNextDayInBackground();
    }, 90000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    if (!autoScan) return;
    scanWatchList();
    const timer = setInterval(scanWatchList, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, watchText, range]);

  // K線雷達：背景自動執行，每 10 分鐘更新一次
  useEffect(() => {
    let cancelled = false;

    async function loadKlineRadarInBackground() {
      if (cancelled) return;
      await scanKlineRadar({ silent: true });
    }

    // 延遲 30 秒才開始，避免網頁剛開時同時發太多請求
    const delay = setTimeout(() => {
      loadKlineRadarInBackground();
    }, 30000);

    const timer = setInterval(() => {
      loadKlineRadarInBackground();
    }, 600000);  // 10 分鐘

    return () => {
      cancelled = true;
      clearTimeout(delay);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    if (!realtimeDayTrade || activeMenu !== "daytrade") return;
    const target = query.trim();
    if (!target) return;

    const timer = setInterval(() => {
      searchIntraday(target, true);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeDayTrade, activeMenu, query, klineType]);

  const sortedWatchList = useMemo(() => {
    const list = [...watchList];
    const sorters = {
      score: (a, b) => b.score - a.score,
      change: (a, b) => b.changePct - a.changePct,
      volume: (a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0),
      rsi: (a, b) => (b.rsi || 0) - (a.rsi || 0),
      win: (a, b) => (b.winRatePredict || 0) - (a.winRatePredict || 0),
    };
    return list.sort(sorters[sortMode] || sorters.score);
  }, [watchList, sortMode]);

  const displayedWatchList = useMemo(() => {
    if (favoriteGroupFilter === "全部") return sortedWatchList;

    const allowed = new Set(
      favorites
        .filter((item) => (item.group || "選單1") === favoriteGroupFilter)
        .map((item) => item.symbol)
    );

    return sortedWatchList.filter((item) => allowed.has(item.symbol));
  }, [sortedWatchList, favorites, favoriteGroupFilter]);


  const sortedDayTradeList = useMemo(() => {
    return [...dayTradeList].sort((a, b) => (b.dayTrade?.score || 0) - (a.dayTrade?.score || 0));
  }, [dayTradeList]);

  const calcClosePositionPct = (item) => {
    const last = item?.history?.at?.(-1);
    if (!last || !Number.isFinite(last.high) || !Number.isFinite(last.low) || last.high === last.low) return null;
    return Math.round(((last.close - last.low) / (last.high - last.low)) * 100);
  };

  const buildAutoTradeAdvice = (item) => {
    const change = Number(item?.changePct || 0);
    const volumeRatio = Number(item?.volumeRatio || 0);
    const closePos = calcClosePositionPct(item);
    const nextScore = Number(item?.nextDay?.nextDayScore ?? item?.radarScore ?? item?.score ?? 0);
    const gap = Number(item?.nextDay?.gapUpProbability ?? item?.mainUpProbability ?? item?.winRatePredict ?? 0);
    const fakeRisk = Number(item?.nextDay?.fakeBreakout ? 82 : item?.fakeBreakoutRisk ?? item?.riskScore ?? 0);

    const tags = [];
    tags.push(`今日漲幅 ${change.toFixed(2)}%`);
    tags.push(volumeRatio >= 2 ? `成交量大幅放大 ${volumeRatio.toFixed(2)}倍` : volumeRatio >= 1.3 ? `成交量放大 ${volumeRatio.toFixed(2)}倍` : `量能 ${volumeRatio ? volumeRatio.toFixed(2) + "倍" : "待確認"}`);
    tags.push(closePos != null ? `收盤位置 ${closePos}%` : "收盤位置待確認");
    tags.push(item?.tradeSignal?.action === "BUY" || item?.nextDay?.nextDaySignal?.includes("候選") ? "符合強勢候選" : "強勢條件待確認");
    tags.push(change >= 9.5 ? "接近漲停 / 已漲停" : "未鎖漲停");
    tags.push(item?.nextDay?.fakeBreakout || fakeRisk >= 65 ? "假突破風險偏高" : "假突破風險可控");
    if (item?.candlePattern?.title?.includes("長上影") || item?.bearishSignals?.some?.((s) => s.signalName?.includes("長上影"))) {
      tags.push("爆量長上影風險");
    } else {
      tags.push("未見明顯爆量長上影");
    }
    tags.push(`評分 ${Math.round(nextScore)}`);

    const openHighProbability = Math.max(0, Math.min(100, Math.round(gap || (50 + change * 2 + Math.min(volumeRatio, 3) * 5 - fakeRisk * 0.15))));
    const continueProbability = Math.max(0, Math.min(100, Math.round((item?.mainUpProbability || 0) || (45 + nextScore * 0.35 + (closePos || 50) * 0.15 + Math.min(volumeRatio, 3) * 5 - fakeRisk * 0.25))));
    const sellRisk = Math.max(0, Math.min(100, Math.round(fakeRisk + (change >= 9 ? 12 : 0) + (closePos != null && closePos < 55 ? 10 : 0))));

    const strategy =
      sellRisk >= 70
        ? "風險偏高，只觀察不追高，等回測或5分K轉強"
        : openHighProbability >= 70 && continueProbability >= 65
        ? "只追開盤5分K強勢，不追高；量縮或跌破開盤低點就退出"
        : openHighProbability >= 58
        ? "可列觀察，等待開盤量能確認後再進場"
        : "續強條件不足，先放觀察名單";

    return {
      conditionTags: tags,
      openHighProbability,
      continueProbability,
      sellRisk,
      strategy,
    };
  };

  const sortedNextDayList = useMemo(() => {
    const list = [...nextDayList];

    const sorters = {
      score: (a, b) => (b.nextDay?.nextDayScore || 0) - (a.nextDay?.nextDayScore || 0),
      gap: (a, b) => (b.nextDay?.gapUpProbability || 0) - (a.nextDay?.gapUpProbability || 0),
      change: (a, b) => (b.changePct || 0) - (a.changePct || 0),
      volume: (a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0),
    };

    return list.sort(sorters[nextDaySortMode] || sorters.score);
  }, [nextDayList, nextDaySortMode]);


  const sortedKlineRadarList = useMemo(() => {
    const list = [...klineRadarList];

    if (klineRadarSort === "volume") {
      return list.sort((a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0));
    }

    if (klineRadarSort === "change") {
      return list.sort((a, b) => (b.changePct || 0) - (a.changePct || 0));
    }

    if (klineRadarSort === "breakout") {
      return list.sort((a, b) => {
        const aBreak = a.nearBreakout ? 1 : 0;
        const bBreak = b.nearBreakout ? 1 : 0;
        return bBreak - aBreak || (b.radarScore || 0) - (a.radarScore || 0);
      });
    }

    return list.sort((a, b) => (b.radarScore || 0) - (a.radarScore || 0));
  }, [klineRadarList, klineRadarSort]);

  const filteredSystemStrongList = useMemo(() => {
    const list = [...systemStrongList];
    const filtered =
      strongCategory === "全部"
        ? list
        : list.filter((item) => item.strongType === strongCategory || item.baseType === strongCategory);

    return filtered.sort((a, b) => b.score - a.score);
  }, [systemStrongList, strongCategory]);

  const strongCategoryOptions = useMemo(() => {
    const options = new Set(["全部"]);
    systemStrongList.forEach((item) => {
      if (item.strongType) options.add(item.strongType);
      if (item.baseType) options.add(item.baseType);
    });
    return [...options];
  }, [systemStrongList]);

  const marketStats = useMemo(() => {
    const breadthSource = marketBreadthList.length ? marketBreadthList : systemStrongList;

    const up = breadthSource.filter((s) => s.changePct > 0).length;
    const down = breadthSource.filter((s) => s.changePct < 0).length;
    const flat = breadthSource.filter((s) => s.changePct === 0).length;
    const breadthAvg = breadthSource.length
      ? breadthSource.reduce((sum, s) => sum + (s.changePct || 0), 0) / breadthSource.length
      : 0;

    const indexChange = taiwanMarketIndex?.changePct;
    const avg = Number.isFinite(indexChange) ? indexChange : breadthAvg;
    const advRatio = breadthSource.length ? (up / breadthSource.length) * 100 : 0;

    return {
      up,
      down,
      flat,
      avg,
      breadthAvg,
      total: breadthSource.length,
      advRatio,
      indexSymbol: taiwanMarketIndex?.symbol || "^TWII",
      indexName: "台灣加權指數",
      indexPrice: taiwanMarketIndex?.close ?? null,
      indexChangePct: Number.isFinite(indexChange) ? indexChange : null,
      sourceName: taiwanMarketIndex ? "台灣加權指數 ^TWII" : "台股市場池暫代",
    };
  }, [marketBreadthList, systemStrongList, taiwanMarketIndex]);

  const stockProfile = useMemo(() => getStockProfile(stock), [stock]);

  const institutionalFlow = useMemo(() => buildInstitutionalFlow(stock), [stock]);
  const institutionalTotalText =
    institutionalFlow.totalNet > 0
      ? `三大法人合計買超 ${institutionalFlow.totalNet.toLocaleString()} 張`
      : institutionalFlow.totalNet < 0
      ? `三大法人合計賣超 ${Math.abs(institutionalFlow.totalNet).toLocaleString()} 張`
      : "三大法人合計持平";

  const todayWatchStocks = [...systemStrongList, ...watchList]
    .filter(Boolean)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  const dailyNews = [
    {
      title: "台股今日震盪整理，AI、半導體與高股息 ETF 仍是市場關注焦點",
      source: "市場觀察",
      impact: "偏多",
    },
    {
      title: "美股科技股走勢分歧，資金持續觀察 NVIDIA、Apple 與大型 ETF 表現",
      source: "美股觀察",
      impact: "中性",
    },
    {
      title: "美元與台幣匯率影響外資買賣超，短線需留意資金流向變化",
      source: "匯率觀察",
      impact: "中性偏空",
    },
    {
      title: "比特幣維持高波動，市場風險偏好仍會影響科技股與成長股",
      source: "加密市場",
      impact: "高波動",
    },
    {
      title: "成交量放大個股仍是短線主軸，但需小心爆量不漲與長上影線",
      source: "技術面觀察",
      impact: "短線觀察",
    },
  ];

  const bestDailyStock = todayWatchStocks[0];

  const dailyAiSummary = bestDailyStock
    ? `今日市場可先聚焦 ${bestDailyStock.symbol} ${
        bestDailyStock.name || ""
      }，AI 分數約 ${
        bestDailyStock.score ?? "--"
      } 分，訊號為 ${
        bestDailyStock.tradeSignal?.action || "觀望"
      }。短線操作上，優先觀察量能是否持續放大、RSI 是否過熱，以及 K 線是否出現長上影線。`
    : "目前尚未執行強勢掃描，建議先掃描市場強勢股或自選股後，再產生 AI 摘要。";

  const reportUniverse = useMemo(() => {
    const map = new Map();

    [...systemStrongList, ...watchList, ...nextDayList, ...dayTradeList]
      .filter(Boolean)
      .forEach((item) => {
        if (!item?.symbol) return;
        const old = map.get(item.symbol);
        if (!old || (item.score || 0) > (old.score || 0)) {
          map.set(item.symbol, item);
        }
      });

    return [...map.values()];
  }, [systemStrongList, watchList, nextDayList, dayTradeList]);

  const reportStrongTop50 = useMemo(() => {
    return [...reportUniverse]
      .filter((s) => Number.isFinite(s.changePct))
      .sort((a, b) => {
        const aScore = (a.score || 0) * 0.45 + Math.max(a.changePct || 0, 0) * 8 + (a.volumeRatio || 0) * 8;
        const bScore = (b.score || 0) * 0.45 + Math.max(b.changePct || 0, 0) * 8 + (b.volumeRatio || 0) * 8;
        return bScore - aScore;
      })
      .slice(0, 50);
  }, [reportUniverse]);

  const reportWeakTop50 = useMemo(() => {
    return [...reportUniverse]
      .filter((s) => Number.isFinite(s.changePct))
      .sort((a, b) => {
        const aScore = (a.score || 0) * 0.35 + (a.changePct || 0) * 10 + (a.volumeRatio || 0);
        const bScore = (b.score || 0) * 0.35 + (b.changePct || 0) * 10 + (b.volumeRatio || 0);
        return aScore - bScore;
      })
      .slice(0, 50);
  }, [reportUniverse]);


  const reportIndustryRank = useMemo(() => {
    function buildIndustryRows(list, direction = "strong") {
      const map = new Map();

      list.forEach((s) => {
        const industry =
          s.baseType ||
          s.strongType ||
          (s.currency === "USD" ? "美股 / ETF" : "其他");

        const old = map.get(industry) || {
          industry,
          count: 0,
          avgChange: 0,
          avgScore: 0,
          avgVolumeRatio: 0,
          stocks: [],
        };

        old.count += 1;
        old.avgChange += s.changePct || 0;
        old.avgScore += s.score || 0;
        old.avgVolumeRatio += s.volumeRatio || 0;
        old.stocks.push(s);
        map.set(industry, old);
      });

      return [...map.values()]
        .map((item) => ({
          ...item,
          avgChange: item.count ? item.avgChange / item.count : 0,
          avgScore: item.count ? item.avgScore / item.count : 0,
          avgVolumeRatio: item.count ? item.avgVolumeRatio / item.count : 0,
          topStocks: item.stocks.slice(0, 5),
        }))
        .sort((a, b) => {
          const aRank = a.avgScore * 0.4 + a.avgChange * 10 + a.avgVolumeRatio * 6;
          const bRank = b.avgScore * 0.4 + b.avgChange * 10 + b.avgVolumeRatio * 6;
          return direction === "strong" ? bRank - aRank : aRank - bRank;
        })
        .slice(0, 5);
    }

    return {
      strong: buildIndustryRows(reportStrongTop50, "strong"),
      weak: buildIndustryRows(reportWeakTop50, "weak"),
    };
  }, [reportStrongTop50, reportWeakTop50]);

  const usTechWatchList = useMemo(() => {
    const codes = ["NVDA", "AAPL", "TSLA", "MSFT", "META", "AMD", "AMZN", "GOOGL", "SMCI", "QQQ", "SOXX"];
    return codes
      .map((code) => reportUniverse.find((s) => s.symbol === code))
      .filter(Boolean);
  }, [reportUniverse]);

  const industryReport = useMemo(() => {
    const quoteMap = new Map();

    [...systemStrongList, ...marketBreadthList, ...watchList, ...Object.values(selectedGroupQuotes)]
      .filter(Boolean)
      .forEach((item) => {
        const master = getMasterByCode(item.symbol);
        if (!master || !isCommonTaiwanStock(master)) return;
        quoteMap.set(master.stockCode, {
          ...item,
          symbol: master.stockCode,
          name: master.stockName,
          officialIndustry: master.officialIndustry,
          subIndustry: master.subIndustry,
          themeTags: master.themeTags,
        });
      });

    const industryMap = new Map();

    quoteMap.forEach((quote) => {
      const master = getMasterByCode(quote.symbol);
      if (!master) return;

      const keys = new Set([
        normalizeGroupName(master.officialIndustry),
        getIndustryKeyFromMaster(master),
        ...(master.themeTags || []),
      ]);

      Object.keys(conceptMap).forEach((conceptName) => {
        if (master.themeTags?.includes(conceptName) || conceptMap[conceptName]?.includes(master.stockCode)) {
          keys.add(conceptName);
        }
      });

      keys.forEach((key) => {
        if (!key || key === "ETF") return;

        const old = industryMap.get(key) || {
          name: key,
          count: 0,
          up: 0,
          down: 0,
          avgChange: 0,
          avgScore: 0,
          volume: 0,
          leader: null,
        };

        const change = Number.isFinite(quote.changePct) ? quote.changePct : 0;
        const score = Number.isFinite(quote.score) ? quote.score : 0;
        const volume = Number(quote.volume || quote.history?.at?.(-1)?.volume || 0);

        industryMap.set(key, {
          ...old,
          count: old.count + 1,
          up: old.up + (change > 0 ? 1 : 0),
          down: old.down + (change < 0 ? 1 : 0),
          avgChange: old.avgChange + change,
          avgScore: old.avgScore + score,
          volume: old.volume + volume,
          leader:
            !old.leader || change > (old.leader.changePct || -999)
              ? quote
              : old.leader,
        });
      });
    });

    const result = [...industryMap.values()]
      .map((item) => {
        const members = resolveGroupStocks(item.name);
        const stocks = members.map((master) => mergeRealtimeQuote(master, quoteMap));

        return {
          ...item,
          totalMembers: members.length,
          avgChange: item.count ? item.avgChange / item.count : 0,
          avgScore: item.count ? item.avgScore / item.count : 0,
          stocks: stocks.sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999)),
        };
      })
      .filter((item) => item.totalMembers > 0);

    return {
      strong: result
        .filter((item) => item.avgChange >= 0)
        .sort((a, b) => b.avgChange - a.avgChange)
        .slice(0, 8),
      weak: result
        .filter((item) => item.avgChange < 0 || item.down > item.up)
        .sort((a, b) => a.avgChange - b.avgChange)
        .slice(0, 8),
      all: result,
    };
  }, [systemStrongList, marketBreadthList, watchList, selectedGroupQuotes]);

  const selectedIndustryDetail = useMemo(() => {
    if (!selectedIndustry) return null;
    const list = selectedIndustry.side === "weak" ? industryReport.weak : industryReport.strong;
    return list.find((item) => item.name === selectedIndustry.name) || null;
  }, [selectedIndustry, industryReport]);

  const terminalStrongFlow = useMemo(() => {
    const names = industryReport.strong.slice(0, 5).map((item) => item.name);
    return names.length ? names : ["ASIC", "AI伺服器", "散熱", "電源管理", "CPO"];
  }, [industryReport]);

  const terminalTopSectors = useMemo(() => {
    return industryReport.strong.slice(0, 4).map((item) => ({
      ...item,
      heat: Math.min(5, Math.max(1, Math.round((item.avgScore || 50) / 20))),
      volumeBoost: Math.round(Math.max(0, (item.volume || 0) / 1000000)),
    }));
  }, [industryReport]);

  const terminalMood = marketStats.avg > 1 ? "偏多" : marketStats.avg > 0 ? "震盪偏多" : marketStats.avg > -1 ? "震盪偏弱" : "偏空";
  const terminalRisk = marketStats.avg > 1.5 ? "中高" : marketStats.avg < -1 ? "中高" : "中低";
  const terminalAIScore = Math.max(0, Math.min(100, Math.round(50 + marketStats.avg * 12 + marketStats.advRatio * 0.35)));

  useEffect(() => {
    if (!selectedIndustry?.name) return;

    let cancelled = false;

    async function loadSelectedGroupQuotes() {
      const masters = resolveGroupStocks(selectedIndustry.name);
      const missing = masters
        .filter((master) => !selectedGroupQuotes[master.stockCode])
        .slice(0, 40);

      if (missing.length === 0) return;

      const results = await Promise.all(
        missing.map((master) =>
          fetchYahooHistory(master.stockCode, "5d", "1d")
            .then((data) => {
              const analyzed = analyzeStock(data);
              return mergeRealtimeQuote(master, new Map([[master.stockCode, analyzed]]));
            })
            .catch((err) => {
              console.warn("selected group quote failed", selectedIndustry.name, master.stockCode, err);
              return null;
            })
        )
      );

      if (cancelled) return;

      const next = {};
      results.filter(Boolean).forEach((item) => {
        next[item.symbol] = item;
      });

      if (Object.keys(next).length) {
        setSelectedGroupQuotes((prev) => ({ ...prev, ...next }));
      }
    }

    loadSelectedGroupQuotes();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry?.name]);

  const reportNextDayCandidates = useMemo(() => {
    return [...sortedNextDayList]
      .filter((s) => !s.nextDay?.fakeBreakout)
      .slice(0, 25);
  }, [sortedNextDayList]);

  const reportDayTradeCandidates = useMemo(() => {
    return [...sortedDayTradeList]
      .filter((s) => (s.dayTrade?.score || 0) >= 35)
      .slice(0, 25);
  }, [sortedDayTradeList]);

  const marketDirectionText =
    marketStats.avg > 1
      ? "多方明顯偏強"
      : marketStats.avg > 0
      ? "震盪偏多"
      : marketStats.avg < -1
      ? "空方明顯偏弱"
      : "震盪偏弱";

  const marketMoodText =
    marketStats.avg > 1
      ? "極度樂觀"
      : marketStats.avg > 0
      ? "偏多"
      : marketStats.avg < -1
      ? "偏空"
      : "保守觀望";

  const aiRiskItems = [
    marketStats.avg < 0 ? "⚠️ 市場平均漲跌幅偏弱，追價前需確認量能與大盤方向。" : "⚠️ 盤勢雖偏多，仍要避免追高長上影與爆量不漲標的。",
    reportStrongTop50.some((s) => (s.changePct || 0) > 5) ? "⚠️ 部分強勢股短線漲幅過大，隔日容易開高震盪。" : "⚠️ 強勢股漲幅尚未全面過熱，但仍需分批進出。",
    "⚠️ 美債 / 匯率 / BTC 屬風險情緒指標，目前未接即時資料，請搭配外部行情確認。",
    "⚠️ AI 分數只適合輔助判斷，不能取代停損與資金控管。",
  ];

  const tomorrowStrategyItems = [
    marketStats.avg >= 0 ? "📌 大盤偏多時，優先觀察強勢股回測支撐後轉強。" : "📌 大盤偏弱時，先降低持股比例，等待量能回溫。",
    "🔥 強勢股 Top25 只挑量比放大、收盤站上短均線、沒有長上影的標的。",
    "🌙 隔日沖優先選擇：高分數、開高機率高、未觸發假突破的股票。",
    "⚡ 當沖觀察股只做高流動性與量能放大的標的，避免冷門股。",
    "🛡️ 若開盤 30 分鐘內指數快速轉弱，暫停追價，改等回測或尾盤確認。",
  ];

  const suggestion = useMemo(() => [], []);

  return (
    <div className="terminal-shell">
      <style>{`
        button {border: 0;border-radius: 10px;padding: 8px 11px;background: #0ea5e9;color: #03111f;font-weight: 900;cursor: pointer;font-size: 13px;
        transition:background .18s ease,filter .18s ease,transform .18s ease,border-color .18s ease;}
        button:hover {filter: brightness(1.12);transform: translateY(-1px);}
        button:active {transform: translateY(0);}
        button:disabled {opacity: .55;cursor: not-allowed;}
        button.ghost {background: #0f1929;color: #e5e7eb;border: 1px solid #1e3a55;}
        button.ghost:hover {background: #152236;border-color: #2d5a80;}
        button.danger {background: #f43f5e;color: #2d0312;}
        button.danger:hover {filter: brightness(1.08);}
        input, textarea, select { width: 100%; box-sizing: border-box; background: #060e1a; color: #e5e7eb; border: 1px solid #1e3a55; border-radius: 10px; padding: 9px; outline: none; font-size: 13px; }
        label { display: block; color: #6b7f94; margin: 8px 0 4px; font-size: 11px; letter-spacing: .04em; }
        h1, h2, h3 { margin: 0; }
        .terminal-shell { min-height: 100vh; background: radial-gradient(circle at top left, #0d1f35, #07111e 55%); }
        #root { width: 100vw; min-height: 100vh; margin: 0; padding: 0; }
        .app-frame { min-height: 100vh; }
        .left-nav { position: fixed !important; left: 0; top: 0; bottom: 0; width: 170px; z-index: 1000; }
        .content { margin-left: 170px; min-height: 100vh; }
        .left-nav { background: linear-gradient(180deg, rgba(7,13,22,.98), rgba(7,13,22,.95)); border-right: 1px solid rgba(56,189,248,.12); padding: 14px 10px; height: 100vh; box-sizing: border-box; overflow-y: auto; }
        .logo { display: flex; gap: 10px; align-items: center; padding: 8px 8px 18px; border-bottom: 1px solid rgba(56,189,248,.10); margin-bottom: 14px; }
        .logo-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#0ea5e9,#0369a1); display: grid; place-items: center; font-weight: 900; box-shadow: 0 0 14px rgba(14,165,233,.18); }
        .logo b { display: block; font-size: 14px; }
        .logo span { color: #8899aa; font-size: 11px; }
        .nav-btn { width: 100%; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; background: transparent; color: #8899aa; border: 1px solid transparent; justify-content: flex-start; padding: 9px 10px; border-radius: 8px; font-size: 12px; }
        .nav-btn:hover { color: #dde3ea; background: rgba(14,165,233,.08); border-color: transparent; transform: none; }
        .nav-btn.active { color: #38bdf8; background: rgba(14,165,233,.12); border-color: rgba(14,165,233,.25); box-shadow: none; font-weight: 600; }
        .nav-exit { margin-top: 2px; color: #b0bec5; background: rgba(6,14,26,.40); }
        .left-nav .nav-btn:nth-of-type(4),
        .left-nav .nav-btn:nth-of-type(8) {
          margin-top: 18px;
          position: relative;
        }
        .left-nav .nav-btn:nth-of-type(4)::before,
        .left-nav .nav-btn:nth-of-type(8)::before {
          content: "";
          position: absolute;
          left: 6px;
          right: 6px;
          top: -10px;
          height: 1px;
          background: rgba(56,189,248,.10);
        }
        .kline-radar-hero { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 16px 0; }
        .kline-radar-hero > div { border: 1px solid rgba(14,165,233,.12); background: rgba(6,14,26,.65); border-radius: 18px; padding: 16px; }
        .kline-radar-hero span { display: block; color: #b0bec5; font-size: 12px; margin-bottom: 8px; }
        .kline-radar-hero b { display: block; color: #f8fafc; font-size: 30px; line-height: 1; }
        .kline-radar-hero small { display: block; color: #8899aa; font-size: 11px; margin-top: 8px; }
        .radar-score b { display: block; color: #38bdf8; font-size: 20px; }
        .radar-score span { color: #b0bec5; font-size: 12px; }
        .tag-list.compact { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-list.compact span { border: 1px solid rgba(14,165,233,.20); background: rgba(56,189,248,.08); color: #bae6fd; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
        .tag-list.compact.bearish span { border-color: rgba(255,59,92,.18); background: rgba(255,59,92,.08); color: #fecdd3; }
        .tag-list.compact.bullish span { border-color: rgba(14,165,233,.20); background: rgba(56,189,248,.08); color: #bae6fd; }
        .kline-radar-table tbody tr:hover { background: rgba(34,211,238,.06); cursor: pointer; }
        .auto-criteria-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0 16px; }
        .auto-criteria-panel > div { border: 1px solid rgba(14,165,233,.12); background: rgba(6,14,26,.42); border-radius: 16px; padding: 13px 15px; }
        .auto-criteria-panel b { display: block; color: #f8fafc; margin-bottom: 6px; }
        .auto-criteria-panel span { color: #b0bec5; line-height: 1.6; font-size: 13px; }
        .condition-mini-list { display: flex; flex-wrap: wrap; gap: 6px; max-width: 310px; }
        .condition-mini-list span { border: 1px solid rgba(14,165,233,.20); background: rgba(14,165,233,.08); color: #bae6fd; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
        .advice-mini { display: grid; gap: 4px; min-width: 260px; max-width: 340px; }
        .advice-mini b { color: #f8fafc; font-size: 12px; }
        .advice-mini span { color: #fbbf24; font-size: 12px; }
        .advice-mini em { color: #dde3ea; font-style: normal; font-size: 12px; line-height: 1.45; }
        @media (max-width: 900px) { .auto-criteria-panel { grid-template-columns: 1fr; } }
        @media (max-width: 1100px) { .kline-radar-hero { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 720px) { .kline-radar-hero { grid-template-columns: 1fr; } }
        .content { padding: 16px; margin-left: 170px; }
        .top-bar { position: relative; display: grid; grid-template-columns: 240px 1fr 360px; align-items: center; gap: 16px; margin-bottom: 14px; min-height: 96px; }
        .floating-header { /* no shadow */
          position: sticky;
          top: 0;
          z-index: 9999;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          background: linear-gradient(to bottom, rgba(2,6,23,.94), rgba(2,6,23,.78));
          border: 1px solid rgba(148,163,184,.08);
          border-top: 0;
          border-radius: 0 0 20px 20px;
          padding: 12px 14px;
          box-shadow: 0 14px 34px rgba(0,0,0,.26), 0 1px 0 rgba(255,255,255,.03) inset;
        }
        .floating-header::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(14,165,233,.20), transparent);
          pointer-events: none;
        }
        .top-back-btn { height: 44px; border-radius: 10px; background: rgba(10,24,44,.90); color: #b0bec5; border: 1px solid rgba(14,165,233,.18); font-size: 13px; font-weight: 600; box-shadow: none; padding: 0 16px; }
        .top-back-btn:hover { background: rgba(14,165,233,.12); border-color: rgba(14,165,233,.35); color: #38bdf8; }
        .top-title { text-align: center; justify-self: center; }
        .top-title h1 { font-size: 32px; letter-spacing: 2px; font-weight: 900; }
        .top-title p { color: #b0bec5; font-size: 13px; margin: 8px 0 0; white-space: nowrap; }
        .top-stats { display: flex; gap: 12px; align-items: center; justify-content: flex-end; }
        .mini-stat { min-width: 80px; background: rgba(14,165,233,.06); border: 1px solid rgba(14,165,233,.14); border-radius: 8px; padding: 8px 12px; text-align: center; }
        .mini-stat span { color: #6b7f94; font-size: 10px; letter-spacing: .04em; }
        .mini-stat b { display: block; font-size: 20px; margin-top: 5px; }
        @media (max-width: 1280px) {
          .top-bar { grid-template-columns: 1fr; min-height: auto; }
          .top-title { order: -1; }
          .top-title p { white-space: normal; }
          .top-stats { justify-content: center; }
          .top-back-btn { width: 100%; }
        }
        .card { background: rgba(12,28,50,.88); border: 1px solid rgba(14,165,233,.16); border-radius: 14px; box-shadow: 0 14px 36px rgba(0,0,0,.28); padding: 12px; }
        .favorite-action { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #031220; }
        .favorite-action.saved { background: #14532d; color: #bbf7d0; border: 1px solid rgba(34,197,94,.45); }
        .favorite-notice { margin-top: 8px; color: #facc15; font-size: 13px; }
        .favorite-picker { position: absolute; z-index: 50; min-width: 150px; background: #0b1929; border: 1px solid rgba(56,189,248,.22); border-radius: 14px; padding: 8px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .favorite-picker button { width: 100%; margin-bottom: 6px; background: #111f30; color: #e5e7eb; border: 1px solid #1e3a55; }
        .favorite-picker button:last-child { margin-bottom: 0; }
        .watch-actions { position: relative; display: inline-block; }
        .watch-menu { position: absolute; right: 0; top: 44px; z-index: 20; width: 280px; background: #0b1929; border: 1px solid rgba(14,165,233,.20); border-radius: 16px; padding: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .chart-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .indicator-dropdown { position: relative; }
        .indicator-menu { position: absolute; right: 0; top: 42px; z-index: 30; width: 230px; background: #0b1929; border: 1px solid rgba(14,165,233,.20); border-radius: 14px; padding: 10px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .indicator-menu .toggle-card { margin-bottom: 8px; }
        .indicator-menu .toggle-card:last-child { margin-bottom: 0; }
        .summary-grid { display: grid; grid-template-columns: 1.1fr 1fr .8fr 1fr; gap: 10px; margin-bottom: 10px; }
        .analysis-layout { display: grid; grid-template-columns: 300px 1fr 340px; gap: 10px; align-items: start; }
        .center-stack { display: contents; }
        .search-combo-card { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 10px; background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 14px; }
        .search-form-zone { padding-bottom: 12px; border-bottom: 1px solid rgba(14,165,233,.10); margin-bottom: 2px; }
        .search-current-zone { display: flex; flex-direction: column; gap: 10px; }
        .search-current-zone .quick-selected-card { margin-top: 0; border-top: 0; padding-top: 0; }
        .profile-mini-card { background: rgba(6,14,26,.60); border: 1px solid rgba(14,165,233,.10); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 0; }
        .profile-mini-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 7px 0; border-bottom: .5px solid rgba(14,165,233,.08); }
        .profile-mini-row:last-child { border-bottom: 0; }
        @media (max-width: 1280px) {
          .search-combo-card { grid-column: 1 / -1; grid-template-columns: 1fr; }
          .search-form-zone { border-right: 0; padding-right: 0; border-bottom: 1px solid rgba(56,189,248,.12); padding-bottom: 12px; }
          .search-current-zone { grid-template-columns: 1fr; }
        }
        .combined-market-card { grid-column: 2; grid-row: 1; min-height: 210px; display: block; }
        .chart-area-card { grid-column: 2; grid-row: 1 / span 2; background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 14px; }
        .selected-panel { text-align: center; }
        .selected-name { font-size: 22px; font-weight: 900; letter-spacing: .02em; color: #f8fafc; margin: 3px 0 4px; line-height: 1.12; }
        .selected-symbol { font-size: 13px; font-weight: 700; margin: 2px 0 8px; color: #38bdf8; }
        .stock-name-stack { display: flex; flex-direction: column; gap: 2px; line-height: 1.15; }
        .stock-name-main { font-size: 25px; font-weight: 900; color: #f8fafc; letter-spacing: .03em; }
        .stock-name-code { font-size: 13px; color: #38bdf8; font-weight: 700; }
        .stock-name-main.small { font-size: 22px; }
        .selected-panel .price { text-align: center; margin-top: 8px; font-size: 24px; line-height: 1.15; }
        .selected-panel .price small { font-size: 13px; margin-top: 4px; }
        .selected-panel .price .price-label { font-size: 14px; margin-right: 8px; color: #e5e7eb; font-weight: 700; }
        .market-panel { border-left: 1px solid rgba(148,163,184,.22); padding-left: 20px; }
        .quick-selected-card { background: rgba(14,165,233,.07); border: 1px solid rgba(14,165,233,.18); border-radius: 10px; padding: 12px; text-align: center; border-top: 2px solid #0ea5e9; }
        .profile-card-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .profile-hero { background: rgba(6,14,26,.72); border: 1px solid rgba(14,165,233,.20); border-radius: 16px; padding: 16px; }
        .profile-hero h3 { font-size: 22px; margin-bottom: 8px; color: #f8fafc; }
        .profile-row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 10px 0; border-top: 1px solid rgba(56,189,248,.10); }
        .profile-row:first-child { border-top: 0; }
        .profile-label { color: #b0bec5; font-size: 13px; }
        .profile-value { color: #e5e7eb; font-weight: 800; }
        .institution-summary { background: rgba(6,14,26,.78); border: 1px solid rgba(14,165,233,.16); border-radius: 14px; padding: 12px; margin-bottom: 10px; }
        .institution-summary b { display: block; font-size: 18px; margin-bottom: 4px; }
        .institution-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .institution-box { background: rgba(6,14,26,.70); border: 1px solid rgba(14,165,233,.10); border-radius: 8px; padding: 8px 10px; }
        .institution-box span { display:block; color:#b0bec5; font-size:12px; margin-bottom:4px; }
        .institution-box b { font-size:16px; }

        .right-panel-card { grid-column: 3; grid-row: 1 / span 2; position: sticky; top: 10px; max-height: calc(100vh - 80px); overflow-y: auto; background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 14px; }

        .main-grid { display: grid; grid-template-columns: minmax(680px, 1fr) 370px; gap: 10px; align-items: start; }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .section-title h2 { font-size: 16px; }
        .muted { color: #b0bec5; font-size: 13px; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 7px 9px; background: #172554; color: #7dd3fc; font-size: 12px; }
        .divider { height: .5px; background: rgba(14,165,233,.10); margin: 10px 0; }
        .market-card { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .market-box { background: #0b1929; border: 1px solid rgba(14,165,233,.12); border-radius: 14px; padding: 12px; }
        .market-box b { display: block; font-size: 22px; }
        .up { color: #fb7185; }
        .down { color: #34d399; }
        .neutral { color: #facc15; }
        .stock-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(14,165,233,.10); }
        .stock-title h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; color: #f1f5f9; }
        .chart-profile-inline { background: rgba(6,14,26,.56); border: 1px solid rgba(14,165,233,.20); border-radius: 14px; padding: 12px 16px; display: grid; gap: 10px; }
        .chart-profile-inline b { display: block; color: #f8fafc; font-size: 16px; margin-top: 4px; line-height: 1.45; }
        .price { font-size: 26px; font-weight: 900; text-align: right; }
        .price small { display: block; font-size: 14px; margin-top: 4px; }
        .trading-chart { width: 100%; min-height: 520px; border-radius: 10px; overflow: hidden; background: #060e1a; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: .5px solid rgba(14,165,233,.08); }
        .tag-row span { background: rgba(14,165,233,.08); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 11px; border: 1px solid rgba(14,165,233,.15); }
        .indicator-toggle { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
        .toggle-card { display: flex; align-items: center; gap: 8px; background: #0b1929; border: 1px solid rgba(14,165,233,.16); border-radius: 12px; padding: 10px; color: #dde3ea; font-size: 13px; cursor: pointer; }
        .toggle-card input { width: auto; accent-color: #38bdf8; }
        .view-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
        .view-tabs button { background: rgba(14,165,233,.06); color: #8899aa; border: 1px solid rgba(14,165,233,.12); padding: 8px 6px; font-size: 12px; border-radius: 8px; font-weight: 600; }
        .view-tabs button.active { background: rgba(14,165,233,.18); color: #38bdf8; border-color: rgba(14,165,233,.45); font-weight: 700; }
        .report-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid rgba(56,189,248,.10); padding-bottom: 10px; }
        .report-tabs button { background: #0b1929; color: #dde3ea; border: 1px solid rgba(148,163,184,.22); }
        .report-tabs button.active { background: rgba(56,189,248,.22); color: #38bdf8; border-color: rgba(56,189,248,.55); }
        .terminal-home-clean { margin-bottom: 16px; }
        .market-core { min-height: 300px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, .85fr); gap: 18px; border: 1px solid rgba(148,163,184,.10); border-radius: 24px; background: linear-gradient(135deg, rgba(10,24,44,.82), rgba(2,6,23,.82)); padding: 28px; }
        .market-core-left { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
        .market-core-label { color: #b0bec5; font-size: 13px; font-weight: 800; letter-spacing: .08em; }
        .market-core-title { margin-top: 10px; font-size: clamp(48px, 6vw, 86px); line-height: .95; font-weight: 950; letter-spacing: -.05em; }
        .market-core.refined { min-height: 330px; align-items: center; }
        .market-core-heading { color: #dde3ea; font-size: clamp(26px, 3vw, 44px); font-weight: 950; letter-spacing: -.03em; }
        .market-core-title-large { margin-top: 14px; font-size: clamp(54px, 7vw, 104px); line-height: .92; font-weight: 950; letter-spacing: -.06em; }
        .market-core-title-large.up { color: #ff3b5c; }
        .market-core-title-large.down { color: #00c896; }
        .market-core-substats { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 20px; color: #dde3ea; font-size: 15px; }
        .market-core-substats span { position: relative; }
        .market-core-substats span:not(:last-child)::after { content: ""; position: absolute; right: -10px; top: 50%; width: 1px; height: 14px; transform: translateY(-50%); background: rgba(14,165,233,.14); }
        .market-primary-card { margin-bottom: 14px; }
        .market-primary-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
        .market-primary-head h2 { margin: 0 0 6px; }
        .market-stats-grid.primary { margin-top: 0; }
        .market-stats-grid.primary div:first-child b { font-size: 30px; color: #f8fafc; }
        .market-core.flow-only { min-height: 210px; grid-template-columns: .48fr 1fr; padding: 24px 28px; }
        .market-core.flow-only .market-core-left { justify-content: center; }
        .main-themes.featured { margin-top: 16px; }
        .main-themes.featured button { padding: 10px 16px; border-radius: 16px; font-size: 15px; }
        .flow-title.enlarged { color: #e2e8f0; font-size: 26px; font-weight: 950; letter-spacing: -.03em; margin-bottom: 18px; }
        .flow-path.upgraded { gap: 12px; }
        .flow-path.upgraded .flow-segment { gap: 12px; }
        .flow-path.upgraded button { border-radius: 18px; padding: 11px 17px; background: linear-gradient(180deg, rgba(15,23,42,.92), rgba(2,6,23,.88)); border-color: rgba(14,165,233,.14); color: #f8fafc; box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
        .flow-path.upgraded button:hover { border-color: rgba(94,234,212,.5); color: #bae6fd; transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0,0,0,.22), 0 0 22px rgba(94,234,212,.10); }
        .flow-path.upgraded i { color: #8899aa; font-size: 18px; }
        .market-core-title.up { color: #ff3b5c; }
        .market-core-title.down { color: #00c896; }
        .market-core-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 22px; color: #dde3ea; font-size: 14px; }
        .market-core-meta span { position: relative; }
        .market-core-meta span:not(:last-child)::after { content: ""; position: absolute; right: -10px; top: 50%; width: 1px; height: 14px; transform: translateY(-50%); background: rgba(148,163,184,.22); }
        .main-themes { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 26px; }
        .theme-label { color: #8899aa; font-size: 12px; font-weight: 800; margin-right: 4px; }
        .main-themes button, .flow-path button { border: 1px solid rgba(14,165,233,.12); background: rgba(10,24,44,.78); color: #e2e8f0; border-radius: 999px; padding: 7px 11px; font-size: 13px; font-weight: 800; transition: all .18s ease; }
        .main-themes button:hover, .flow-path button:hover { border-color: rgba(94,234,212,.45); color: #bae6fd; box-shadow: 0 0 18px rgba(94,234,212,.10); }
        .market-core-flow { align-self: center; border-left: 1px solid rgba(56,189,248,.10); padding-left: 24px; }
        .flow-title { color: #b0bec5; font-size: 13px; font-weight: 800; margin-bottom: 14px; }
        .flow-path { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .flow-segment { display: inline-flex; gap: 10px; align-items: center; }
        .flow-segment i { color: #8899aa; font-style: normal; }
        .sector-strip { margin-top: 14px; border: 1px solid rgba(148,163,184,.10); border-radius: 22px; background: rgba(10,24,44,.62); padding: 18px; }
        .strip-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 14px; }
        .strip-head h3 { margin: 0; font-size: 18px; }
        .strip-head span { color: #8899aa; font-size: 12px; }
        .sector-strip-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .sector-tile { text-align: left; border: 1px solid rgba(148,163,184,.10); border-radius: 18px; background: rgba(6,14,26,.54); padding: 14px; transition: all .18s ease; }
        .sector-tile:hover { transform: translateY(-2px); border-color: rgba(94,234,212,.32); box-shadow: 0 16px 36px rgba(0,0,0,.22), 0 0 22px rgba(56,189,248,.08); }
        .sector-tile-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sector-tile-top b { color: #f8fafc; font-size: 16px; }
        .sector-tile-top strong { color: #ff3b5c; font-size: 17px; }
        .sector-tile-row { display: flex; justify-content: space-between; gap: 10px; color: #b0bec5; font-size: 12px; margin-top: 7px; }
        .sector-tile-row em { color: #dde3ea; font-style: normal; font-weight: 800; }
        .sector-tile-bar { height: 3px; border-radius: 999px; background: rgba(56,189,248,.10); margin-top: 13px; overflow: hidden; }
        .sector-tile-bar i { display: block; height: 100%; border-radius: 999px; background: #5eead4; }
        @media (max-width: 1400px) {
          .market-core { grid-template-columns: 1fr; }
          .market-core-flow { border-left: 0; border-top: 1px solid rgba(56,189,248,.10); padding-left: 0; padding-top: 18px; }
          .sector-strip-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 760px) {
          .market-core { padding: 20px; }
          .market-core-meta { gap: 10px; }
          .market-core-meta span::after { display: none; }
          .sector-strip-grid { grid-template-columns: 1fr; }
        }
        .report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .report-card, .macro-card { background: #0e1e32; border: 1px solid rgba(14,165,233,.16); border-radius: 16px; padding: 14px; }
        .report-card h2, .macro-card h3 { margin-bottom: 12px; }
        .market-direction-badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; font-weight: 900; margin-bottom: 12px; border: 1px solid rgba(148,163,184,.22); }
        .market-direction-badge.up { background: rgba(239,68,68,.14); color: #fca5a5; border-color: rgba(239,68,68,.35); }
        .market-direction-badge.down { background: rgba(34,197,94,.14); color: #86efac; border-color: rgba(34,197,94,.35); }
        .market-stats-grid, .macro-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .market-stats-grid div, .industry-item, .risk-item, .strategy-item { background: rgba(10,24,44,.85); border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 12px; }
        /* ── 今日大盤方向 排版 ─────────────────────────────────── */
        .market-layout { display: flex; flex-direction: column; gap: 10px; }

        /* 第一列：三格頂部色條卡片 */
        .mkt-row1 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .mkt-card { background: #0e1e32; border: 1px solid rgba(14,165,233,.12); border-radius: 12px; padding: 14px 16px; border-top: 3px solid transparent; }
        .mkt-card-blue  { border-top-color: #0ea5e9; }
        .mkt-card-neutral { border-top-color: #6b7f94; }
        .mkt-card-red   { border-top-color: #fb7185; }
        .mkt-card-label { font-size: 11px; color: #8899aa; letter-spacing: .04em; margin-bottom: 6px; }
        .mkt-card-main  { font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -.02em; margin-bottom: 4px; }
        .mkt-card-sub   { font-size: 12px; color: #8899aa; }

        /* 第二列：風險提醒橫排 */
        .mkt-risk-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .mkt-risk-item { background: rgba(251,191,36,.06); border: 1px solid rgba(251,191,36,.14); border-left: 2px solid #f59e0b; border-radius: 8px; padding: 9px 12px; font-size: 12px; color: #fbbf24; line-height: 1.5; display: flex; gap: 7px; align-items: flex-start; }
        .mkt-risk-dot { width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; margin-top: 5px; }

        /* 第三列：左右各半 */
        .mkt-row3 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mkt-half-card { background: #0e1e32; border: 1px solid rgba(14,165,233,.12); border-radius: 12px; padding: 14px 16px; }
        .mkt-half-title { font-size: 11px; font-weight: 700; color: #8899aa; letter-spacing: .05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .mkt-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .mkt-dot-blue   { background: #0ea5e9; }
        .mkt-dot-orange { background: #fb923c; }
        .mkt-dot-yellow { background: #fbbf24; }

        /* 主流族群 */
        .mkt-themes { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 4px; }
        .mkt-theme-tag { background: rgba(14,165,233,.10); color: #38bdf8; border: 1px solid rgba(14,165,233,.22); border-radius: 7px; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .mkt-theme-tag:hover { background: rgba(14,165,233,.20); }
        .mkt-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
        .mkt-flow-seg { display: flex; align-items: center; gap: 4px; }
        .mkt-flow-seg button { background: rgba(14,165,233,.06); color: #b0bec5; border: 1px solid rgba(14,165,233,.12); border-radius: 6px; padding: 3px 9px; font-size: 11px; cursor: pointer; }
        .mkt-flow-seg button:hover { color: #38bdf8; }
        .mkt-arrow { color: #526880; font-size: 11px; }

        /* 明日策略 */
        .mkt-strategy { display: flex; flex-direction: column; gap: 7px; }
        .mkt-strategy-item { font-size: 12px; color: #b0bec5; line-height: 1.6; padding: 8px 10px; background: rgba(14,165,233,.04); border-radius: 8px; border-left: 2px solid rgba(14,165,233,.20); }

        @media (max-width: 1100px) {
          .mkt-row1 { grid-template-columns: 1fr 1fr; }
          .mkt-risk-row { grid-template-columns: 1fr 1fr; }
          .mkt-row3 { grid-template-columns: 1fr; }
        }

        /* ── 掃描頁共用版面（K線雷達 + 隔日沖） ─────────────────── */
        .scan-layout { display: grid; grid-template-columns: 210px 1fr; gap: 12px; align-items: start; }

        /* 左側篩選面板 */
        .scan-sidebar { background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 16px; position: sticky; top: 10px; display: flex; flex-direction: column; gap: 10px; }
        .scan-sidebar-title { font-size: 14px; font-weight: 700; color: #f1f5f9; }
        .scan-sidebar-desc { font-size: 11px; color: #6b7f94; line-height: 1.5; }
        .scan-sidebar-section { font-size: 10px; font-weight: 700; color: #6b7f94; letter-spacing: .06em; text-transform: uppercase; padding-top: 4px; border-top: .5px solid rgba(14,165,233,.10); }

        /* 統計格 */
        .scan-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .scan-stat { background: rgba(14,165,233,.07); border: 1px solid rgba(14,165,233,.14); border-radius: 8px; padding: 8px; }
        .scan-stat-label { font-size: 10px; color: #8899aa; letter-spacing: .03em; margin-bottom: 3px; }
        .scan-stat-val { font-size: 20px; font-weight: 700; color: #f1f5f9; line-height: 1; margin-bottom: 2px; }
        .scan-stat-sub { font-size: 10px; color: #6b7f94; }

        /* 條件列表 */
        .scan-criteria-list { display: flex; flex-direction: column; gap: 5px; }
        .scan-criteria-item { font-size: 11px; color: #b0bec5; padding: 4px 8px; background: rgba(14,165,233,.04); border-radius: 6px; border-left: 2px solid rgba(14,165,233,.20); }

        /* 選單 + 按鈕 */
        .scan-select { width: 100%; font-size: 12px; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(14,165,233,.18); background: #0b1929; color: #e2e8f0; }
        .scan-btn { width: 100%; padding: 9px; border-radius: 8px; background: rgba(14,165,233,.15); color: #38bdf8; border: 1px solid rgba(14,165,233,.30); font-size: 12px; font-weight: 700; cursor: pointer; margin-top: 4px; }
        .scan-btn:hover { background: rgba(14,165,233,.25); }
        .scan-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* 右側結果 */
        .scan-result { background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; overflow: hidden; }
        .scan-empty { padding: 60px 24px; text-align: center; color: #6b7f94; font-size: 13px; }
        .scan-table-wrap { overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 180px); }

        /* 表格 */
        .scan-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .scan-table thead { position: sticky; top: 0; z-index: 10; }
        .scan-table thead tr { background: #0d1e32; border-bottom: 2px solid rgba(14,165,233,.30); }
        .scan-table th { padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #8899aa; letter-spacing: .04em; white-space: nowrap; }
        .scan-table td { padding: 11px 10px; border-bottom: 1px solid rgba(14,165,233,.12); vertical-align: middle; }
        .scan-row { cursor: pointer; }
        .scan-row:hover td { background: rgba(14,165,233,.07); }
        .scan-row:nth-child(even) td { background: rgba(14,165,233,.03); }
        .scan-row:nth-child(even):hover td { background: rgba(14,165,233,.08); }
        .scan-row:last-child td { border-bottom: none; }
        .scan-table-wrap { overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 180px); }

        /* 表格內容元素 */
        .scan-rank { color: #6b7f94; font-size: 11px; font-weight: 700; text-align: center; }
        .scan-stock-name { font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 2px; }
        .scan-stock-code { font-size: 10px; color: #6b7f94; }
        .scan-score { font-size: 16px; font-weight: 800; color: #38bdf8; line-height: 1; }
        .scan-score span { display: block; font-size: 10px; color: #8899aa; font-weight: 400; margin-top: 2px; }
        .scan-badge { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 4px; background: rgba(14,165,233,.10); color: #38bdf8; border: 1px solid rgba(14,165,233,.20); white-space: nowrap; margin-top: 3px; }
        .scan-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .scan-tags span { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
        .scan-tags.bullish span { background: rgba(34,197,94,.10); color: #4ade80; border: 1px solid rgba(34,197,94,.20); }
        .scan-tags.bearish span { background: rgba(248,113,113,.10); color: #fb7185; border: 1px solid rgba(248,113,113,.20); }
        .scan-tag-empty { color: #526880; font-size: 11px; }
        .scan-advice-main { font-size: 11px; font-weight: 600; color: #dde3ea; margin-bottom: 2px; }
        .scan-advice-risk { font-size: 11px; color: #f59e0b; margin-bottom: 2px; }
        .scan-advice-note { font-size: 10px; color: #8899aa; line-height: 1.4; }

        .ai-summary-main { font-size: 15px; color: #e2e8f0; margin-bottom: 12px; line-height: 1.6; }
        .ai-risk-inline { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; border-top: 1px solid rgba(56,189,248,.10); padding-top: 12px; }
        .ai-risk-inline-item { font-size: 13px; color: #fbbf24; padding: 6px 10px; background: rgba(251,191,36,.08); border-radius: 8px; border-left: 3px solid rgba(251,191,36,.5); }
        /* 左欄新聞 */
        .left-news-card { background: #0e1e32; border: 1px solid rgba(14,165,233,.12); border-radius: 10px; padding: 12px; }
        .left-news-title { font-size: 11px; font-weight: 700; color: #8899aa; letter-spacing: .04em; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
        .left-news-item { display: block; padding: 7px 0; border-bottom: .5px solid rgba(14,165,233,.08); text-decoration: none; }
        .left-news-item:last-child { border-bottom: none; }
        .left-news-item:hover .left-news-item-title { color: #38bdf8; }
        .left-news-item-title { font-size: 12px; color: #dde3ea; line-height: 1.45; margin-bottom: 3px; }
        .left-news-item-meta { font-size: 10px; color: #6b7f94; display: flex; gap: 8px; }
        .news-section { display: flex; flex-direction: column; gap: 1px; }
        .news-section-title { font-size: 13px; font-weight: 700; color: #b0bec5; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .news-item { display: block; padding: 10px 0; border-bottom: 1px solid rgba(14,165,233,.08); text-decoration: none; cursor: pointer; }
        .news-item:hover .news-item-title { color: #38bdf8; }
        .news-item:last-child { border-bottom: 0; }
        .news-item-title { font-size: 13px; color: #e2e8f0; line-height: 1.5; margin-bottom: 4px; }
        .news-item-meta { display: flex; gap: 10px; font-size: 11px; color: #8899aa; }
        .news-item-snippet { font-size: 11px; color: #8899aa; margin: 2px 0 4px; line-height: 1.4; }
        .news-loading { font-size: 13px; color: #8899aa; padding: 12px 0; }
        .news-tab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .news-tab-card { background: rgba(6,14,26,.78); border: 1px solid rgba(14,165,233,.12); border-radius: 14px; padding: 16px; }
        .news-tab-card-title { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px; }
        .news-tab-item { padding: 10px 0; border-bottom: 1px solid rgba(148,163,184,.08); }
        .news-tab-item:last-child { border-bottom: 0; }
        .news-tab-item a { text-decoration: none; }
        .news-tab-item a:hover .news-item-title { color: #38bdf8; }
        .market-stats-grid span, .macro-card p { display: block; color: #b0bec5; font-size: 12px; margin-bottom: 6px; }
        .market-stats-grid b, .macro-card b { font-size: 20px; }
        .ai-summary-box { margin-top: 12px; padding: 14px; border-radius: 16px; background: rgba(56,189,248,.08); border: 1px solid rgba(56,189,248,.22); color: #bae6fd; }
        .industry-list, .risk-list, .strategy-box { display: grid; gap: 10px; }
        .industry-item { display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all .18s ease; text-align:left; }
        .industry-item:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.45); background: rgba(30,41,59,.92); }
        .industry-item.active { border-color: rgba(34,211,238,.62); background: rgba(8,47,73,.55); }
        .industry-detail-card { grid-column: 1 / -1; margin-top: 12px; }
        .industry-item > div { min-width: 0; }
        .industry-item.up span { color: #fca5a5; }
        .industry-item.down span { color: #86efac; }
        .report-empty { color: #b0bec5; padding: 16px; border: 1px dashed rgba(14,165,233,.20); border-radius: 14px; }
        .drawing-panel { background: rgba(6,14,26,.72); border: 1px solid rgba(14,165,233,.16); border-radius: 14px; padding: 10px; margin: 10px 0; }
        .drawing-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; color: #e5e7eb; margin-bottom: 8px; }
        .drawing-title span { color: #b0bec5; font-size: 12px; }
        .drawing-mode-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .drawing-mode-tabs button { background: #111f30; color: #e5e7eb; border: 1px solid #1e3a55; }
        .drawing-mode-tabs button.active { background: #0ea5e9; color: #f0f9ff; border-color: #0ea5e9; }
        .drawing-free-box { background: rgba(10,24,44,.75); border: 1px solid rgba(14,165,233,.20); border-radius: 12px; padding: 9px; margin-top: 8px; }
        .chart-drawing-wrap { position: relative; width: 100%; }
        .chart-free-draw-overlay { position: absolute; inset: 0; width: 100%; height: 560px; pointer-events: none; z-index: 10; }
        .chart-drawing-wrap.drawing-active .chart-free-draw-overlay { pointer-events: auto; cursor: crosshair; touch-action: none; }
        .chart-drawing-wrap.drawing-active .trading-chart { user-select: none; }
        .chart-free-draw-overlay line, .chart-free-draw-overlay path, .chart-free-draw-overlay rect { pointer-events: none; }
        .drawing-chip.line { border-color: rgba(56,189,248,.5); color: #38bdf8; }
        .drawing-chip.brush { border-color: rgba(250,204,21,.55); color: #fde68a; }
        .drawing-chip.rect { border-color: rgba(168,85,247,.5); color: #d8b4fe; }
        .drawing-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .drawing-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .drawing-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; padding: 5px 6px 5px 10px; font-size: 12px; color: #e5e7eb; background: #0b1929; }
        .drawing-chip.support { border-color: rgba(34,197,94,.45); color: #86efac; }
        .drawing-chip.resistance { border-color: rgba(239,68,68,.45); color: #fca5a5; }
        .drawing-chip.stop { border-color: rgba(249,115,22,.5); color: #fdba74; }
        .drawing-chip.trend { border-color: rgba(56,189,248,.5); color: #38bdf8; }
        .drawing-chip.zone { border-color: rgba(168,85,247,.5); color: #d8b4fe; }
        .drawing-chip button { padding: 1px 6px; border-radius: 999px; background: rgba(14,165,233,.14); color: #e5e7eb; font-size: 12px; }



        .score-main { background: linear-gradient(135deg, rgba(14,165,233,.18), rgba(3,105,161,.14)); border: 1px solid rgba(14,165,233,.25); border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 10px; }
        .score-main b { display: block; font-size: 42px; line-height: 1; font-weight: 800; color: #38bdf8; }
        .score-main span { color: #7dd3fc; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
        .metric-card { background: rgba(6,14,26,.70); border: 1px solid rgba(14,165,233,.12); border-radius: 8px; padding: 8px 10px; }
        .metric-card b { display: block; font-size: 15px; font-weight: 700; margin-bottom: 2px; color: #f1f5f9; }
        .metric-card span { color: #6b7f94; font-size: 10px; letter-spacing: .03em; }
        .trade-signal { border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid rgba(14,165,233,.14); background: rgba(6,14,26,.80); }
        .trade-signal.buy { border-color: rgba(34,197,94,.35); border-top: 2px solid #22c55e; background: rgba(20,83,45,.15); }
        .trade-signal.hold { border-color: rgba(250,204,21,.30); border-top: 2px solid #fbbf24; background: rgba(113,63,18,.12); }
        .trade-signal.sell { border-color: rgba(248,113,113,.35); border-top: 2px solid #fb7185; background: rgba(127,29,29,.12); }
        .signal-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .signal-action b { font-size: 26px; letter-spacing: 1px; font-weight: 800; }
        .signal-action span { display: block; color: #dde3ea; font-size: 13px; margin-top: 4px; }
        .signal-list { margin: 8px 0 0; padding-left: 18px; color: #b0bec5; font-size: 13px; line-height: 1.65; }
        .signal-card { background: rgba(6,14,26,.70); border: 1px solid rgba(14,165,233,.10); border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
        .signal-card b { display: block; font-size: 16px; margin-bottom: 6px; }
        .signal-card p { color: #b0bec5; font-size: 13px; line-height: 1.55; margin: 0; }
        .daytrade-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; align-items: start; }
        .daytrade-score { background: linear-gradient(135deg, rgba(14,165,233,.18), rgba(34,197,94,.14)); border: 1px solid rgba(34,211,238,.28); border-radius: 18px; padding: 18px; text-align: center; }
        .daytrade-score b { display: block; font-size: 54px; line-height: 1; }
        .daytrade-score span { color: #bae6fd; font-weight: 900; }
        .entry-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
        .entry-box { background: #0b1929; border: 1px solid rgba(14,165,233,.16); border-radius: 14px; padding: 12px; text-align: center; }
        .entry-box b { display: block; font-size: 20px; margin-top: 4px; }
        .radar-alert { border-radius: 16px; padding: 14px; margin-bottom: 12px; border: 1px solid rgba(250,204,21,.35); background: rgba(113,63,18,.2); }
        .radar-alert.good { border-color: rgba(34,197,94,.45); background: rgba(20,83,45,.24); }
        .radar-alert.bad { border-color: rgba(248,113,113,.45); background: rgba(127,29,29,.2); }
        .instant-signal { border: 1px solid rgba(34,211,238,.35); background: rgba(8,47,73,.26); border-radius: 16px; padding: 14px; margin-bottom: 12px; }
        .instant-signal.buy { border-color: rgba(34,197,94,.55); background: rgba(20,83,45,.28); }
        .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 6px; box-shadow: 0 0 12px #22c55e; }
        .watch-table-card { margin-top: 12px; }
        .table-wrap { overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 200px); border: 1px solid rgba(14,165,233,.14); border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead { position: sticky; top: 0; z-index: 10; }
        th, td { padding: 11px 10px; text-align: left; white-space: nowrap; }
        td { color: #f8fafc; font-weight: 500; border-bottom: 1px solid rgba(14,165,233,.14); }
        th { color: #38bdf8; font-size: 11px; background: #0d1e32; border-bottom: 2px solid rgba(14,165,233,.28); }
        tbody tr:nth-child(even) td { background: rgba(14,165,233,.025); }
        td .muted, td small { color: #dde3ea; }
        .stock-name-code, .selected-symbol, .metric-value, .mini-stat b, .kline-radar-hero b, .radar-score b, .profile-value, .institution-summary b, .advice-mini b { color: #f8fafc !important; }
        .stock-name-code { opacity: 1; }
        .badge { color: #f8fafc; }
        tr { cursor: pointer; }
        tr:hover td { background: rgba(14,165,233,.08) !important; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 8px; font-size: 12px; background: #0b1929; border: 1px solid rgba(14,165,233,.15); color: #dde3ea; }
        .favorite-list { display: grid; gap: 8px; }
        .favorite-item { display: flex; justify-content: space-between; gap: 8px; align-items: center; background: #0b1929; border: 1px solid rgba(14,165,233,.14); border-radius: 14px; padding: 10px; }
        .empty { color: #b0bec5; padding: 18px; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; margin-top: 12px; }
        .up { color: #fb7185 !important; }
        .down { color: #34d399 !important; }
        .price, .selected-panel .price, .top-stats b { color: #f8fafc; }
                .up,
        b.up,
        td.up,
        .market-stats-grid b.up,
        .summary-grid b.up,
        .price .up {
          color: #fb7185 !important;
        }
        .down,
        b.down,
        td.down,
        .market-stats-grid b.down,
        .summary-grid b.down,
        .price .down {
          color: #34d399 !important;
        }
        @media (max-width: 1300px) { .summary-grid, .main-grid, .analysis-layout, .combined-market-card { grid-template-columns: 1fr; } .combined-market-card, .chart-area-card, .right-panel-card { grid-column: auto; grid-row: auto; } .center-stack { display: grid; gap: 10px; } .left-nav { width: 140px; } .content { margin-left: 140px; } .chart-tools { align-items: stretch; } .market-panel { border-left: 0; padding-left: 0; border-top: 1px solid rgba(14,165,233,.16); padding-top: 14px; } .right-panel-card { position: static; } }
        button {transition: background .18s ease, filter .18s ease, transform .18s ease, border-color .18s ease;}
        button:hover {filter: brightness(1.12);transform: translateY(-1px);}
        button.ghost:hover {background: #152236;border-color: #2d5a80;}
        button.danger:hover {filter: brightness(1.08);}
      `}</style>

      <div className="app-frame">
        <aside className="left-nav">
          <div className="logo">
            <div className="logo-icon">↗</div>
            <div><b>股市雷達</b><span>Quant Terminal</span></div>
          </div>
          <button className={`nav-btn ${activeMenu === "report" ? "active" : ""}`} onClick={() => setActiveMenu("report")}>🏠 首頁 / 每日報告</button>
          <button className={`nav-btn ${activeMenu === "analysis" ? "active" : ""}`} onClick={() => setActiveMenu("analysis")}>📊 分析看板</button>
          <button className={`nav-btn ${activeMenu === "watchlist" ? "active" : ""}`} onClick={() => setActiveMenu("watchlist")}>⭐ 自選股票</button>
          <button className={`nav-btn ${activeMenu === "signals" ? "active" : ""}`} onClick={() => setActiveMenu("signals")}>🚨 強勢掃描</button>
          <button className={`nav-btn ${activeMenu === "klineRadar" ? "active" : ""}`} onClick={() => setActiveMenu("klineRadar")}>📡 K線訊號雷達</button>
          <button className={`nav-btn ${activeMenu === "nextday" ? "active" : ""}`} onClick={() => setActiveMenu("nextday")}>🌙 隔日沖選股</button>
          <button className={`nav-btn ${activeMenu === "daytrade" ? "active" : ""}`} onClick={() => setActiveMenu("daytrade")}>⚡ 當沖模式</button>
          <button className="nav-btn nav-exit" onClick={() => navigate("/")}>← 返回首頁</button>
        </aside>

        <section className="content">
          <header className="top-bar floating-header">
            <button className="top-back-btn" onClick={goBackToPreviousView}>
              ← 返回上一個畫面
            </button>

            <div className="top-title">
              <h1>股市分析</h1>
              <p>追蹤台股、美股與 ETF，整合 AI 分數、K線、量價與進出場提示。</p>
            </div>

            <div className="top-stats">
              <div className="mini-stat"><span>目前標的</span><b>{stock?.symbol || query}</b></div>
              <div className="mini-stat"><span>AI分數</span><b>{stock?.score ?? "--"}</b></div>
              <div className="mini-stat"><span>勝率預測</span><b>{stock?.winRatePredict ? `${stock.winRatePredict}%` : "--"}</b></div>
            </div>
          </header>

          {activeMenu === "analysis" && (
            <div className="analysis-layout">
              <div className="card search-combo-card">
                <div className="search-form-zone">
                <label style={{fontSize:11,color:"#8fafc8",letterSpacing:".04em",marginBottom:4,display:"block"}}>股票代碼或名稱</label>
                <input
                  list="stock-search-history"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="2330、台積電、雷科、矽力-KY、AAPL"
                  onKeyDown={(e) => e.key === "Enter" && searchOne()}
                />
                <datalist id="stock-search-history">
                  {searchHistory.map((item) => (
                    <option key={item} value={item} />
                  ))}
                  {[].map((item) => (
                    <option key={`${item.code}-${item.name}`} value={item.name}>
                      {item.code}｜{item.market}｜{item.industry}
                    </option>
                  ))}
                </datalist>

                <label>資料區間</label>
                <select value={range} onChange={(e) => setRange(e.target.value)}>
                  <option value="3mo">3個月</option>
                  <option value="6mo">6個月</option>
                  <option value="1y">1年</option>
                  <option value="2y">2年</option>
                  <option value="5y">5年</option>
                  <option value="10y">10年</option>
                  <option value="max">最長</option>
                </select>

                <div className="btn-row">
                  <button onClick={() => searchOne()} disabled={loading}>
                    {loading ? "查詢中..." : "查詢股票"}
                  </button>

                  <div style={{ position: "relative" }}>
                    <button
                      className={`favorite-action ${
                        stock && favorites.some((item) => item.symbol === stock.symbol) ? "saved" : ""
                      }`}
                      disabled={!stock?.symbol}
                      onClick={() =>
                        stock?.symbol &&
                        setFavoritePickerStock((prev) =>
                          prev?.symbol === stock.symbol ? null : stock
                        )
                      }
                    >
                      {stock && favorites.some((item) => item.symbol === stock.symbol) ? "已收藏" : "加入收藏"}
                    </button>

                    {favoritePickerStock && stock?.symbol && favoritePickerStock.symbol === stock.symbol && (
                      <div className="favorite-picker">
                        {FAVORITE_GROUPS.map((group) => (
                          <button key={group} onClick={() => addFavorite(stock, group)}>
                            收藏到 {group}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {suggestion.length > 0 && (
                  <div className="chips">
                    {suggestion.map(([name, code]) => (
                      <button key={name} onClick={() => searchOne(code)}>
                        {code} {name}
                      </button>
                    ))}
                  </div>
                )}

                {favoriteNotice && <p className="favorite-notice">{favoriteNotice}</p>}
                {error && <p className="error">{error}</p>}

                                </div>

                <div className="quick-selected-card">
                  <div className="muted" style={{fontSize:11,letterSpacing:".04em"}}>目前選股</div>
                  <div className="selected-name">
                    {getDisplayName(stock?.symbol, stock?.name) || "尚未載入資料"}
                  </div>
                  <div className="selected-symbol">{stock?.symbol || query}</div>
                  <div className={stock?.changePct >= 0 ? "price up" : "price down"}>
                    <span className="price-label">現價</span>
                    {stock?.close?.toFixed?.(2) ?? "--"}
                    <small>{stock?.changePct?.toFixed?.(2) ?? "--"}%</small>
                  </div>
                </div>
              
                  <div className="profile-mini-card">
                    <div className="profile-mini-row">
                      <span className="profile-label">所屬產業</span>
                      <span className="profile-value">{stockProfile.industry}</span>
                    </div>
                    <div className="profile-mini-row">
                      <span className="profile-label">主要產品 / 業務</span>
                      <span className="profile-value">{stockProfile.business}</span>
                    </div>
                  </div>

                  {/* 個股相關新聞（左欄） */}
                  {stock && (
                    <div className="left-news-card">
                      <div className="left-news-title">
                        📰 相關新聞
                        {newsData[stock.symbol]?.loading && <span style={{color:"#7090a8",fontSize:11}}> 載入中...</span>}
                      </div>
                      {(() => {
                        const nd = newsData[stock.symbol];
                        if (!nd || nd.loading) return <div style={{fontSize:12,color:"#7090a8",padding:"6px 0"}}>新聞載入中...</div>;
                        if (!nd.articles?.length) return <div style={{fontSize:12,color:"#7090a8",padding:"6px 0"}}>暫無相關新聞</div>;
                        return nd.articles
                          .filter(a => a.title && !a.title.startsWith("http") && a.title.length > 5)
                          .slice(0, 5).map((article, idx) => {
                            const ts = article.providerPublishTime;
                            const pubAt = article.publishedAt;
                            const t = ts ? new Date(ts * 1000) : pubAt ? new Date(pubAt) : null;
                            const timeStr = t ? t.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
                            return (
                              <a key={idx} href={article.url || article.link} target="_blank" rel="noopener noreferrer" className="left-news-item">
                                <div className="left-news-item-title">{article.title}</div>
                                <div className="left-news-item-meta">
                                  {article.publisher && <span>{article.publisher}</span>}
                                  {timeStr && <span>{timeStr}</span>}
                                </div>
                              </a>
                            );
                        });
                      })()}
                    </div>
                  )}
              </div>

              <div className="center-stack">
                <div className="card chart-area-card">
                  <div className="stock-head">
                    <div className="stock-title">
                      <h1>
                        {stock
                          ? `${getDisplayName(stock.symbol, stock.name)} ${stock.symbol}`
                          : "請搜尋股票"}
                      </h1>
                      <p className="muted">互動 K 線、MA5 / MA20 / MA60、布林通道、成交量</p>
                    </div>

                    {stock && (
                      <div className={stock.changePct >= 0 ? "price up" : "price down"}>
                        <span style={{ fontSize: 16, marginRight: 8, color: "#e5e7eb" }}>現價</span>
                        {stock.close?.toFixed?.(2)}
                        <small>{stock.changePct.toFixed(2)}%</small>
                      </div>
                    )}
                  </div>

                  <div className="chart-tools">
                    <div className="muted">圖表指標</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={klineType}
                        onChange={(e) => changeKlineType(e.target.value, stock?.symbol || query)}
                        style={{ width: 130 }}
                      >
                        <option value="1m">1分K</option>
                        <option value="5m">5分K</option>
                        <option value="30m">30分K</option>
                        <option value="1d">日K</option>
                        <option value="1wk">周K</option>
                        <option value="1mo">月K</option>
                      </select>
                    <div className="indicator-dropdown">
                      <button className="ghost" onClick={() => setIndicatorMenuOpen((v) => !v)}>
                        技術指標 ▾
                      </button>
                      {indicatorMenuOpen && (
                        <div className="indicator-menu">
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} /> MA5 日線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} /> MA20 月線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA60} onChange={(e) => setShowMA60(e.target.checked)} /> MA60 季線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} /> 布林通道
                          </label>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                  {stock ? (
                    <>
                    <DrawingTools targetStock={stock} />
                    <TradingChart
                      stock={stock}
                      showMA5={showMA5}
                      showMA20={showMA20}
                      showMA60={showMA60}
                      showBollinger={showBollinger}
                      chartKey={klineType}
                      drawingLines={getDrawingLines(stock)}
                      freeDrawings={getFreeDrawings(stock)}
                      drawingEnabled={freeDrawingEnabled}
                      drawingTool={freeDrawingTool}
                      onCreateDrawing={(drawing) => addFreeDrawing(stock, drawing)}
                    />
                    </>
                  ) : (
                    <p className="empty">請從上方搜尋股票，或使用網址 /stock/2330。</p>
                  )}

                  {stock && (
                    <div className="tag-row">
                      {stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="card right-panel-card">
                <div className="view-tabs">
                  <button className={rightView === "ai" ? "active" : ""} onClick={() => setRightView("ai")}>AI</button>
                  <button className={rightView === "signals" ? "active" : ""} onClick={() => setRightView("signals")}>訊號</button>
                  <button className={rightView === "institution" ? "active" : ""} onClick={() => setRightView("institution")}>法人</button>
                </div>

                {rightView === "ai" && stock && (
                  <>
                    <div className={`trade-signal ${stock.tradeSignal.tone}`}>
                      <div className="signal-action">
                        <div>
                          <b>{stock.tradeSignal.action}</b>
                          <span>{stock.tradeSignal.label}</span>
                        </div>
                        <span className="badge">AI訊號</span>
                      </div>
                      <div className="muted">主要理由</div>
                      <ul className="signal-list">{stock.tradeSignal.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                      <div className="muted" style={{ marginTop: 8 }}>風險提醒</div>
                      <ul className="signal-list">{stock.tradeSignal.risk.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>

                    <div className="metric-grid">
                      <div className="metric-card"><b>{stock.tradeSignal.stopLoss?.toFixed?.(2)}</b><span>停損 SL</span></div>
                      <div className="metric-card"><b>{stock.tradeSignal.takeProfit?.toFixed?.(2)}</b><span>停利 TP</span></div>
                      <div className="metric-card"><b>{stock.winRatePredict}%</b><span>勝率預測</span></div>
                      <div className="metric-card"><b>{stock.score}</b><span>{stock.level}</span></div>
                    </div>

                    <div className="divider" />
                    <div className="score-main"><b>{stock.score}</b><span>{stock.level}</span></div>
                    <div className="metric-grid">
                      <div className="metric-card"><b>{stock.rsi?.toFixed(1) ?? "--"}</b><span>RSI｜{stock.rsiLabel}</span></div>
                      <div className="metric-card"><b>{stock.k?.toFixed(1) ?? "--"}</b><span>K 值</span></div>
                      <div className="metric-card"><b>{stock.d?.toFixed(1) ?? "--"}</b><span>D 值</span></div>
                      <div className="metric-card"><b>{stock.macdHist?.toFixed(2) ?? "--"}</b><span>MACD</span></div>
                      <div className="metric-card"><b>{stock.ma5?.toFixed(2) ?? "--"}</b><span>MA5</span></div>
                      <div className="metric-card"><b>{stock.ma20?.toFixed(2) ?? "--"}</b><span>MA20</span></div>
                      <div className="metric-card"><b>{stock.volumeRatio?.toFixed(2) ?? "--"}</b><span>量比</span></div>
                      <div className="metric-card"><b>{stock.backtest.trades}</b><span>交易次數</span></div>
                    </div>

                  </>
                )}

                {rightView === "signals" && stock && (
                  <>
                    <div className="signal-card"><b>{stock.volumeSignal.title}</b><p>{stock.volumeSignal.detail}</p></div>
                    <div className="signal-card"><b>{stock.candlePattern.title}</b><p>{stock.candlePattern.detail}</p></div>
                    <div className="signal-card"><b>RSI｜{stock.rsiLabel}</b><p>RSI 目前為 {stock.rsi?.toFixed(1) ?? "--"}。55 以上偏多，45 以下偏弱，70 以上需留意過熱。</p></div>
                    <div className="signal-card"><b>布林通道</b><p>價格靠近上緣代表偏強但可能震盪，靠近下緣代表偏弱或反彈觀察。</p></div>
                  </>
                )}

                {rightView === "institution" && stock && (
                  <>
                    <div className={`institution-summary ${institutionalFlow.totalNet >= 0 ? "up" : "down"}`}>
                      <b>{institutionalTotalText}</b>
                      <p className="muted">籌碼判斷：{institutionalFlow.tone}</p>
                    </div>

                    {institutionalFlow.rows.map((row) => (
                      <div className="signal-card" key={row.name}>
                        <b>{row.name}</b>
                        <div className="institution-row">
                          <div className="institution-box">
                            <span>買進</span>
                            <b>{row.buy.toLocaleString()} 張</b>
                          </div>
                          <div className="institution-box">
                            <span>賣出</span>
                            <b>{row.sell.toLocaleString()} 張</b>
                          </div>
                          <div className="institution-box">
                            <span>買賣超</span>
                            <b className={row.net >= 0 ? "up" : "down"}>
                              {row.net >= 0 ? "+" : ""}
                              {row.net.toLocaleString()} 張
                            </b>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="signal-card">
                      <b>法人解讀規則</b>
                      <p>外資連買 + 投信同步買超：偏多。三大法人同步買超：籌碼偏強。股價上漲但法人賣超：追價需保守。</p>
                      <p className="muted" style={{ marginTop: 8 }}>{institutionalFlow.source}</p>
                    </div>
                  </>
                )}

                {!stock && <p className="empty">尚無分析資料。</p>}
              </div>
            </div>
          )}

          {activeMenu === "watchlist" && (
            <div className="card">
              <div className="section-title">
                <h2>自選股，即時台股與美股標的</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted">更新 {new Date().toLocaleString("zh-TW")}</span>
                  <div className="watch-actions">
                    <button className="ghost" onClick={() => setWatchMenuOpen((v) => !v)}>管理標的 ▾</button>
                    {watchMenuOpen && (
                      <div className="watch-menu">
                        <label>新增 / 刪除代碼</label>
                        <input value={newWatchSymbol} onChange={(e) => setNewWatchSymbol(e.target.value)} placeholder="例如 00919、2330、AAPL" />
                        <div className="btn-row">
                          <button onClick={addWatchSymbol}>新增</button>
                          <button className="danger" onClick={removeSelectedWatchSymbol}>刪除</button>
                        </div>
                        <p className="muted">輸入代碼後可加入或從自選清單移除。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="btn-row" style={{ marginBottom: 12 }}>
                <button onClick={() => scanWatchList()} disabled={scanning}>{scanning ? "更新中..." : "立即刷新"}</button>
                <select value={favoriteGroupFilter} onChange={(e) => setFavoriteGroupFilter(e.target.value)} style={{ width: 150 }}>
                  <option value="全部">全部收藏</option>
                  {FAVORITE_GROUPS.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ width: 180 }}>
                  <option value="score">AI分數排序</option>
                  <option value="change">漲跌幅排序</option>
                  <option value="volume">量比排序</option>
                  <option value="rsi">RSI排序</option>
                  <option value="win">勝率預測排序</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>代號</th><th>市場</th><th>價格</th><th>漲跌</th><th>AI</th><th>勝率</th><th>量比</th><th>訊號</th><th>操作</th></tr></thead>
                  <tbody>
                    {displayedWatchList.map((s) => (
                      <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                        <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
                        <td><span className="badge">{s.currency === "USD" ? "美股" : "台股"}</span></td>
                        <td>{s.currency} {s.close?.toFixed?.(2)}</td>
                        <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                        <td>{s.score}</td>
                        <td>{s.winRatePredict}%</td>
                        <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                        <td><span className="badge">{s.tradeSignal.action}</span></td>
                        <td>
                          <span style={{ position: "relative", display: "inline-block" }}>
                            <button className="ghost small" onClick={(e) => {
                              e.stopPropagation();
                              setFavoritePickerStock((prev) => prev?.symbol === s.symbol ? null : s);
                            }}>收藏</button>
                            {favoritePickerStock && favoritePickerStock.symbol === s.symbol && (
                              <div className="favorite-picker" onClick={(e) => e.stopPropagation()}>
                                {FAVORITE_GROUPS.map((group) => (
                                  <button key={group} onClick={() => addFavorite(s, group)}>
                                    收藏到 {group}
                                  </button>
                                ))}
                              </div>
                            )}
                          </span>{" "}
                          <button className="danger small" onClick={(e) => { e.stopPropagation(); removeWatchSymbol(s.symbol); }}>刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === "signals" && (
            <div className="scan-layout">

              {/* 左側篩選面板 */}
              <div className="scan-sidebar">
                <div className="scan-sidebar-title">🚨 強勢掃描</div>
                <p className="scan-sidebar-desc">依近3日漲幅、量能與AI分數掃描上市/上櫃強勢股前50檔</p>

                <div className="scan-stat-grid">
                  <div className="scan-stat">
                    <div className="scan-stat-label">強勢候選</div>
                    <div className="scan-stat-val">{filteredSystemStrongList.length}</div>
                    <div className="scan-stat-sub">近3日強勢</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">S級強勢</div>
                    <div className="scan-stat-val">{filteredSystemStrongList.filter(s => (s.recent3DayScore||0) >= 120).length}</div>
                    <div className="scan-stat-sub">最強動能</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">爆量強勢</div>
                    <div className="scan-stat-val">{filteredSystemStrongList.filter(s => (s.volumeRatio||0) >= 2).length}</div>
                    <div className="scan-stat-sub">量能放大</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">BUY訊號</div>
                    <div className="scan-stat-val">{filteredSystemStrongList.filter(s => s.tradeSignal?.action === "BUY").length}</div>
                    <div className="scan-stat-sub">建議進場</div>
                  </div>
                </div>

                <div className="scan-sidebar-section">產業篩選</div>
                <select value={strongCategory} onChange={(e) => setStrongCategory(e.target.value)} className="scan-select">
                  {strongCategoryOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <div className="scan-sidebar-section">系統條件</div>
                <div className="scan-criteria-list">
                  <div className="scan-criteria-item">近3日漲幅 + 強度</div>
                  <div className="scan-criteria-item">成交量能放大</div>
                  <div className="scan-criteria-item">收盤位置強弱</div>
                  <div className="scan-criteria-item">AI分數加權</div>
                </div>

                <button onClick={scanSystemStrongStocks} disabled={systemStrongLoading} className="scan-btn">
                  {systemStrongLoading ? "掃描中..." : "重新掃描"}
                </button>
              </div>

              {/* 右側結果 */}
              <div className="scan-result">
                {filteredSystemStrongList.length === 0 ? (
                  <div className="scan-empty">
                    {systemStrongLoading ? "正在掃描台股強勢股..." : "頁面切換後會自動掃描，或按左側「重新掃描」。"}
                  </div>
                ) : (
                  <div className="scan-table-wrap">
                    <table className="scan-table">
                      <thead>
                        <tr>
                          <th style={{width:36}}>#</th>
                          <th style={{minWidth:130}}>股票</th>
                          <th style={{width:110}}>強勢分類</th>
                          <th style={{width:80}}>近3日強度</th>
                          <th style={{width:80}}>近3日漲幅</th>
                          <th style={{width:50}}>AI</th>
                          <th style={{width:60}}>勝率</th>
                          <th style={{width:60}}>量比</th>
                          <th style={{width:80}}>訊號</th>
                          <th style={{minWidth:140}}>判斷條件</th>
                          <th style={{minWidth:150}}>建議</th>
                          <th style={{minWidth:160}}>理由</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSystemStrongList.map((s, i) => {
                          const adv = buildAutoTradeAdvice(s);
                          return (
                            <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)} className="scan-row">
                              <td className="scan-rank">{i + 1}</td>
                              <td>
                                <div className="scan-stock-name">{getDisplayName(s.symbol, s.name)}</div>
                                <div className="scan-stock-code">{s.symbol}</div>
                              </td>
                              <td><div className="scan-badge">{s.recent3DayType || s.strongType || s.baseType || "系統候選"}</div></td>
                              <td><div className="scan-score">{s.recent3DayScore ?? "--"}</div></td>
                              <td className={s.recent3DayChange >= 0 ? "up" : "down"} style={{fontWeight:600}}>{s.recent3DayChange?.toFixed?.(2) ?? "--"}%</td>
                              <td style={{fontWeight:600,color:"#38bdf8"}}>{s.score}</td>
                              <td>{s.winRatePredict}%</td>
                              <td style={{fontSize:11}}>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                              <td><div className="scan-badge">{s.tradeSignal.action}</div></td>
                              <td>
                                <div className="condition-mini-list">
                                  {adv.conditionTags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                                </div>
                              </td>
                              <td>
                                <div className="scan-advice-main">開高 {adv.openHighProbability}% · 續強 {adv.continueProbability}%</div>
                                <div className="scan-advice-risk">出貨風險 {adv.sellRisk}%</div>
                                <div className="scan-advice-note">{adv.strategy}</div>
                              </td>
                              <td style={{fontSize:11,color:"#b0bec5",lineHeight:1.5}}>{s.tradeSignal.reasons.slice(0, 2).join("、")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}


          

          {activeMenu === "klineRadar" && (
            <div className="scan-layout">

              {/* 左側篩選面板（固定） */}
              <div className="scan-sidebar">
                <div className="scan-sidebar-title">📡 K線訊號雷達</div>
                <p className="scan-sidebar-desc">掃描今日符合K線型態＋成交量放大的台股</p>

                <div className="scan-stat-grid">
                  <div className="scan-stat"><div className="scan-stat-label">符合訊號</div><div className="scan-stat-val">{sortedKlineRadarList.length}</div><div className="scan-stat-sub">K線+量能</div></div>
                  <div className="scan-stat"><div className="scan-stat-label">S/A 級</div><div className="scan-stat-val">{sortedKlineRadarList.filter((s) => (s.radarScore || 0) >= 78).length}</div><div className="scan-stat-sub">優先名單</div></div>
                  <div className="scan-stat"><div className="scan-stat-label">突破/高點</div><div className="scan-stat-val">{sortedKlineRadarList.filter((s) => s.nearBreakout || s.candleTitle?.includes("突破K")).length}</div><div className="scan-stat-sub">動能觀察</div></div>
                  <div className="scan-stat"><div className="scan-stat-label">爆量上漲</div><div className="scan-stat-val">{sortedKlineRadarList.filter((s) => s.volumeTitle?.includes("爆量上漲")).length}</div><div className="scan-stat-sub">量價同步</div></div>
                </div>

                <div className="scan-sidebar-section">排序方式</div>
                <select value={klineRadarSort} onChange={(e) => setKlineRadarSort(e.target.value)} className="scan-select">
                  <option value="score">依訊號強度</option>
                  <option value="volume">依成交量</option>
                  <option value="change">依漲跌幅</option>
                  <option value="breakout">依突破型態</option>
                </select>

                <div className="scan-sidebar-section">系統條件</div>
                <div className="scan-criteria-list">
                  <div className="scan-criteria-item">漲幅 + 量能放大</div>
                  <div className="scan-criteria-item">收盤位置強弱</div>
                  <div className="scan-criteria-item">爆量長上影過濾</div>
                  <div className="scan-criteria-item">假突破風險評估</div>
                </div>

                <button onClick={scanKlineRadar} disabled={klineRadarLoading} className="scan-btn">
                  {klineRadarLoading ? "掃描中..." : "掃描今日K線訊號"}
                </button>
              </div>

              {/* 右側結果區 */}
              <div className="scan-result">
                {sortedKlineRadarList.length === 0 ? (
                  <div className="scan-empty">
                    {klineRadarLoading ? "正在掃描台股K線與成交量訊號..." : "按左側「掃描今日K線訊號」後，會列出符合K線型態與量能條件的股票。"}
                  </div>
                ) : (
                  <div className="scan-table-wrap">
                    <table className="scan-table">
                      <thead>
                        <tr>
                          <th style={{width:36}}>#</th>
                          <th style={{minWidth:130}}>股票</th>
                          <th style={{width:90}}>訊號 / 結構</th>
                          <th style={{minWidth:140}}>看漲訊號</th>
                          <th style={{minWidth:100}}>看跌 / 風險</th>
                          <th style={{width:70}}>漲跌</th>
                          <th style={{width:70}}>量能</th>
                          <th style={{width:90}}>主升 / 假突</th>
                          <th style={{minWidth:150}}>建議</th>
                          <th style={{minWidth:160}}>觀察理由</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedKlineRadarList.map((s, i) => {
                          const adv = buildAutoTradeAdvice(s);
                          return (
                            <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)} className="scan-row">
                              <td className="scan-rank">{i + 1}</td>
                              <td>
                                <div className="scan-stock-name">{getDisplayName(s.symbol, s.name)}</div>
                                <div className="scan-stock-code">{s.symbol} · {s.baseType || "台股"}</div>
                              </td>
                              <td>
                                <div className="scan-score">{s.radarScore}<span>{s.radarLevel}</span></div>
                                <div className="scan-badge">{s.marketStructure}</div>
                              </td>
                              <td>
                                <div className="scan-tags bullish">
                                  {(s.bullishSignals || []).slice(0, 3).map((sig) => <span key={sig.signalName}>{sig.signalName}</span>)}
                                  {!(s.bullishSignals || []).length && <span className="scan-tag-empty">--</span>}
                                </div>
                              </td>
                              <td>
                                <div className="scan-tags bearish">
                                  {(s.bearishSignals || []).slice(0, 2).map((sig) => <span key={sig.signalName}>{sig.signalName}</span>)}
                                  {!(s.bearishSignals || []).length && <span className="scan-tag-empty">--</span>}
                                </div>
                              </td>
                              <td className={s.changePct >= 0 ? "up" : "down"} style={{fontWeight:600}}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                              <td style={{fontSize:11,color:"var(--color-text-secondary)"}}>{s.volumeTitle || "--"}</td>
                              <td>
                                <div style={{fontSize:11}}>{s.mainUpProbability ?? "--"}%</div>
                                <div style={{fontSize:11}} className={(s.fakeBreakoutRisk||0)>=60?"down":"muted"}>假突 {s.fakeBreakoutRisk ?? "--"}%</div>
                              </td>
                              <td>
                                <div className="scan-advice-main">開高 {adv.openHighProbability}% · 續強 {adv.continueProbability}%</div>
                                <div className="scan-advice-risk">出貨風險 {adv.sellRisk}%</div>
                                <div className="scan-advice-note">{adv.strategy}</div>
                              </td>
                              <td style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.5}}>{(s.radarReasons || []).slice(0, 2).join("、")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

{activeMenu === "nextday" && (
            <div className="scan-layout">

              {/* 左側篩選面板（固定） */}
              <div className="scan-sidebar">
                <div className="scan-sidebar-title">🌙 隔日沖選股</div>
                <p className="scan-sidebar-desc">依漲幅、量能、收盤位置、均線、RSI、MACD 與假突破過濾器評分</p>

                <div className="scan-stat-grid">
                  <div className="scan-stat">
                    <div className="scan-stat-label">目前候選</div>
                    <div className="scan-stat-val">{nextDayLoading ? "--" : sortedNextDayList.filter((s) => (s.nextDay?.nextDayScore || 0) >= 100 && !s.nextDay?.fakeBreakout).length}</div>
                    <div className="scan-stat-sub">B級以上</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">總名單</div>
                    <div className="scan-stat-val">{sortedNextDayList.length}</div>
                    <div className="scan-stat-sub">全部候選</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">假突破</div>
                    <div className="scan-stat-val">{sortedNextDayList.filter(s => s.nextDay?.fakeBreakout).length}</div>
                    <div className="scan-stat-sub">需過濾</div>
                  </div>
                  <div className="scan-stat">
                    <div className="scan-stat-label">S級</div>
                    <div className="scan-stat-val">{sortedNextDayList.filter(s => (s.nextDay?.nextDayScore||0) >= 200).length}</div>
                    <div className="scan-stat-sub">最強勢</div>
                  </div>
                </div>

                <div className="scan-sidebar-section">排序方式</div>
                <select value={nextDaySortMode} onChange={(e) => setNextDaySortMode(e.target.value)} className="scan-select">
                  <option value="score">依隔日沖分數</option>
                  <option value="gap">依開高機率</option>
                  <option value="change">依漲幅</option>
                  <option value="volume">依量比</option>
                </select>

                <div className="scan-sidebar-section">選股邏輯</div>
                <div className="scan-criteria-list">
                  <div className="scan-criteria-item">漲幅強 + 爆量</div>
                  <div className="scan-criteria-item">收近高點 / 突破日高</div>
                  <div className="scan-criteria-item">均線多頭排列</div>
                  <div className="scan-criteria-item">假突破自動過濾</div>
                </div>

                <button onClick={() => scanNextDayList()} disabled={nextDayLoading} className="scan-btn">
                  {nextDayLoading ? "更新中..." : "立即刷新"}
                </button>
              </div>

              {/* 右側結果區 */}
              <div className="scan-result">
                {sortedNextDayList.length === 0 ? (
                  <div className="scan-empty">
                    {nextDayLoading ? "隔日沖名單更新中..." : "目前暫無隔日沖候選，系統會持續背景更新。"}
                  </div>
                ) : (
                  <div className="scan-table-wrap">
                    <table className="scan-table">
                      <thead>
                        <tr>
                          <th style={{width:36}}>#</th>
                          <th style={{minWidth:130}}>股票</th>
                          <th style={{width:100}}>分數 / 等級</th>
                          <th style={{width:70}}>開高機率</th>
                          <th style={{width:80}}>訊號</th>
                          <th style={{width:70}}>漲跌</th>
                          <th style={{width:60}}>量比</th>
                          <th style={{width:70}}>假突破</th>
                          <th style={{minWidth:120}}>判斷條件</th>
                          <th style={{minWidth:150}}>建議</th>
                          <th style={{minWidth:120}}>觀察標籤</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedNextDayList.map((s, i) => {
                          const adv = buildAutoTradeAdvice(s);
                          return (
                            <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)} className="scan-row">
                              <td className="scan-rank">{i + 1}</td>
                              <td>
                                <div className="scan-stock-name">{getDisplayName(s.symbol, s.name)}</div>
                                <div className="scan-stock-code">{s.symbol}</div>
                              </td>
                              <td>
                                <div className="scan-score">{s.nextDay?.nextDayScore ?? "--"}<span>{s.nextDay?.nextDayRank || "待觀察"}</span></div>
                              </td>
                              <td style={{fontWeight:600}}>{s.nextDay?.gapUpProbability ?? "--"}%</td>
                              <td><div className="scan-badge">{s.nextDay?.nextDaySignal || "觀望"}</div></td>
                              <td className={s.changePct >= 0 ? "up" : "down"} style={{fontWeight:600}}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                              <td style={{fontSize:11}}>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                              <td className={s.nextDay?.fakeBreakout ? "down" : "up"} style={{fontSize:11,fontWeight:600}}>
                                {s.nextDay?.fakeBreakout ? "有風險" : "通過"}
                              </td>
                              <td>
                                <div className="condition-mini-list">
                                  {adv.conditionTags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                                </div>
                              </td>
                              <td>
                                <div className="scan-advice-main">開高 {adv.openHighProbability}% · 續強 {adv.continueProbability}%</div>
                                <div className="scan-advice-risk">出貨風險 {adv.sellRisk}%</div>
                                <div className="scan-advice-note">{adv.strategy}</div>
                              </td>
                              <td style={{fontSize:11,color:"var(--color-text-secondary)"}}>{s.tags?.slice(0, 3).join("、") || s.volumeSignal?.title || "等待確認"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === "daytrade" && (
            <div className="card">
              <div className="section-title">
                <h2>⚡ 當沖模式</h2>
                <span className="muted">1秒刷新、1分鐘K、AI即時進場提示</span>
              </div>

              <div className="btn-row" style={{ marginBottom: 12 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="輸入股票代碼，例如 2330、AAPL"
                  style={{ width: 220 }}
                  onKeyDown={(e) => e.key === "Enter" && searchIntraday(query)}
                />
                <select
                  value={klineType}
                  onChange={(e) => changeKlineType(e.target.value, query)}
                  style={{ width: 150 }}
                >
                  <option value="1m">1分K</option>
                  <option value="5m">5分K</option>
                  <option value="30m">30分K</option>
                  <option value="1d">日K</option>
                  <option value="1wk">周K</option>
                  <option value="1mo">月K</option>
                </select>
                <button onClick={() => searchIntraday(query)} disabled={dayTradeLoading}>
                  {dayTradeLoading ? "查詢中..." : "查詢分K"}
                </button>
                <button onClick={scanDayTradeList} disabled={dayTradeLoading} className="ghost">
                  掃描當沖排行榜
                </button>
                <button
                  className={realtimeDayTrade ? "danger" : "ghost"}
                  onClick={() => setRealtimeDayTrade((v) => !v)}
                >
                  {realtimeDayTrade ? "停止1秒刷新" : "啟動1秒刷新"}
                </button>
              </div>

              <div className="daytrade-grid">
                <div>
                  {intradayStock ? (
                    <>
                      <div className="stock-head">
                        <div className="stock-title">
                          <h1>
                            {getDisplayName(intradayStock.symbol, intradayStock.name)} {intradayStock.symbol}
                          </h1>
                          <p className="muted">目前使用 {klineLabel(klineType)}，資料來源為 Yahoo Finance K線（已加速輪詢，但 Yahoo 台股可能仍有延遲）。</p>
                        </div>
                        <div className={intradayStock.changePct >= 0 ? "price up" : "price down"}>
                          {intradayStock.close?.toFixed?.(2) ?? "--"}
                          <small>{intradayStock.changePct?.toFixed?.(2) ?? "--"}%</small>
                        </div>
                      </div>
                      <div className="chart-tools">
                        <div className="muted">K線週期：{klineLabel(klineType)}</div>
                        <select
                          value={klineType}
                          onChange={(e) => changeKlineType(e.target.value, intradayStock?.symbol || query)}
                          style={{ width: 130 }}
                        >
                          <option value="1m">1分K</option>
                          <option value="5m">5分K</option>
                          <option value="30m">30分K</option>
                          <option value="1d">日K</option>
                          <option value="1wk">周K</option>
                          <option value="1mo">月K</option>
                        </select>
                      </div>
                      <DrawingTools targetStock={intradayStock} />
                      <TradingChart
                        stock={intradayStock}
                        showMA5={showMA5}
                        showMA20={showMA20}
                        showMA60={showMA60}
                        showBollinger={showBollinger}
                        chartKey={klineType}
                        drawingLines={getDrawingLines(intradayStock)}
                        freeDrawings={getFreeDrawings(intradayStock)}
                        drawingEnabled={freeDrawingEnabled}
                        drawingTool={freeDrawingTool}
                        onCreateDrawing={(drawing) => addFreeDrawing(intradayStock, drawing)}
                      />
                    </>
                  ) : (
                    <p className="empty">請先輸入股票代碼並查詢分K，或掃描當沖排行榜。</p>
                  )}
                </div>

                <div>
                  {intradayStock?.dayTrade ? (
                    <>
                      <div className={`instant-signal ${intradayStock.dayTrade.tone}`}>
                        <b><span className="live-dot" />AI 即時進場提示</b>
                        <h2>{intradayStock.dayTrade.signal}</h2>
                        <p className="muted">分數 {intradayStock.dayTrade.score} / 100</p>
                      </div>
                      <div className="entry-grid">
                        <div className="entry-box"><span className="muted">進場參考</span><b>{intradayStock.dayTrade.entry?.toFixed?.(2)}</b></div>
                        <div className="entry-box"><span className="muted">停損 SL</span><b>{intradayStock.dayTrade.stopLoss?.toFixed?.(2)}</b></div>
                        <div className="entry-box"><span className="muted">停利 TP</span><b>{intradayStock.dayTrade.takeProfit?.toFixed?.(2)}</b></div>
                      </div>
                      <div className="signal-card">
                        <b>主要理由</b>
                        <ul className="signal-list">
                          {intradayStock.dayTrade.reasons.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="signal-card">
                        <b>風險提醒</b>
                        <ul className="signal-list">
                          {intradayStock.dayTrade.risks.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="empty">尚無當沖 AI 訊號。</p>
                  )}
                </div>
              </div>

              <div className="card watch-table-card">
                <div className="section-title"><h2>🔥 即時掃描當沖排行榜</h2></div>
                {sortedDayTradeList.length === 0 ? (
                  <p className="empty">按「掃描當沖排行榜」後會顯示結果。</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>排名</th><th>股票</th><th>當沖分數</th><th>漲跌</th><th>量比</th><th>提示</th></tr>
                      </thead>
                      <tbody>
                        {sortedDayTradeList.map((s, i) => (
                          <tr key={s.symbol} onClick={() => { setIntradayStock(s); setStock(s); }}>
                            <td>{i + 1}</td>
                            <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
                            <td>{s.dayTrade?.score ?? "--"}</td>
                            <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                            <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                            <td><span className="badge">{s.dayTrade?.signal || "觀察"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === "report" && (
            <div className="card">
              <div className="section-title">
                <h2>🧾 每日市場報告 Pro</h2>
                <span className="muted">更新 {new Date().toLocaleString("zh-TW")}</span>
              </div>


              <div className="report-tabs">
                <button className={reportTab === "market" ? "active" : ""} onClick={() => setReportTab("market")}>📊 今日大盤方向</button>
                <button className={reportTab === "industry" ? "active" : ""} onClick={() => setReportTab("industry")}>🏭 台股強弱產業</button>
                <button className={reportTab === "us" ? "active" : ""} onClick={() => setReportTab("us")}>🇺🇸 美股科技股</button>
                <button className={reportTab === "macro" ? "active" : ""} onClick={() => setReportTab("macro")}>💱 匯率 / 美債 / BTC</button>
                <button className={reportTab === "strength" ? "active" : ""} onClick={() => setReportTab("strength")}>🔥 強弱勢Top50</button>
                <button className={reportTab === "nextday" ? "active" : ""} onClick={() => setReportTab("nextday")}>🌙 隔日沖候選</button>
                <button className={reportTab === "daytrade" ? "active" : ""} onClick={() => setReportTab("daytrade")}>⚡ 當沖觀察</button>
                <button className={reportTab === "news" ? "active" : ""} onClick={() => setReportTab("news")}>📰 股市新聞</button>

              </div>

              {reportTab === "market" && (
                <div className="market-layout">

                  {/* 第一列：三格頂部色條卡片 */}
                  <div className="mkt-row1">
                    <div className="mkt-card mkt-card-blue">
                      <div className="mkt-card-label">AI 判斷</div>
                      <div className="mkt-card-main">
                        {marketStats.avg > 1 ? "偏多" : marketStats.avg > 0 ? "震盪偏多" : marketStats.avg > -1 ? "震盪偏弱" : "偏空"}
                      </div>
                      <div className="mkt-card-sub">熱度 {terminalAIScore} · {marketDirectionText}</div>
                    </div>
                    <div className="mkt-card mkt-card-neutral">
                      <div className="mkt-card-label">台股加權指數</div>
                      <div className="mkt-card-main">{marketStats.indexPrice ? marketStats.indexPrice.toFixed(2) : "--"}</div>
                      <div className={`mkt-card-sub ${marketStats.avg >= 0 ? "up" : "down"}`}>{marketStats.avg.toFixed(2)}%</div>
                    </div>
                    <div className="mkt-card mkt-card-red">
                      <div className="mkt-card-label">市場寬度</div>
                      <div className="mkt-card-main">
                        {marketStats.total ? `${marketStats.up} / ${marketStats.down}` : "--"}
                      </div>
                      <div className="mkt-card-sub">
                        {marketStats.total ? <><span className="up">{marketStats.up} 漲</span> · <span className="down">{marketStats.down} 跌</span></> : "更新中"}
                      </div>
                    </div>
                  </div>

                  {/* 第二列：AI風險提醒（4格橫排） */}
                  <div className="mkt-risk-row">
                    {aiRiskItems.map((item, idx) => (
                      <div key={idx} className="mkt-risk-item">
                        <span className="mkt-risk-dot" />
                        {item.replace(/^⚠️\s*/, "")}
                      </div>
                    ))}
                  </div>

                  {/* 第三列：主流族群 + 相關新聞 */}
                  <div className="mkt-row3">
                    <div className="mkt-half-card">
                      <div className="mkt-half-title">
                        <span className="mkt-dot mkt-dot-blue" />主流族群
                      </div>
                      <div className="mkt-themes">
                        {terminalStrongFlow.slice(0, 4).map((item) => (
                          <button key={item} className="mkt-theme-tag"
                            onClick={() => { setReportTab("industry"); setSelectedIndustry({ side: "strong", name: item }); }}>
                            {item}
                          </button>
                        ))}
                      </div>
                      <div className="mkt-half-title" style={{marginTop:12}}>
                        <span className="mkt-dot mkt-dot-orange" />資金流方向
                      </div>
                      <div className="mkt-flow">
                        {terminalStrongFlow.slice(0, 5).map((item, i) => (
                          <span key={item} className="mkt-flow-seg">
                            <button onClick={() => { setReportTab("industry"); setSelectedIndustry({ side: "strong", name: item }); }}>{item}</button>
                            {i < 4 && <span className="mkt-arrow">→</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mkt-half-card">
                      <div className="mkt-half-title">
                        <span className="mkt-dot mkt-dot-yellow" />明日操作策略
                      </div>
                      <div className="mkt-strategy">
                        {tomorrowStrategyItems.map((item, i) => (
                          <div key={i} className="mkt-strategy-item">
                            {item.replace(/^[📌🔥]\s*/, "")}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {reportTab === "industry" && (
                <div className="report-grid">
                  <div className="report-card">
                    <div className="section-title">
                      <h2>🏭 台股強勢產業</h2>
                      <span className="muted">點選產業可查看相關股票</span>
                    </div>
                    <div className="industry-list">
                      {industryReport.strong.length ? industryReport.strong.map((item) => (
                        <button
                          type="button"
                          className={`industry-item up ${selectedIndustry?.side === "strong" && selectedIndustry?.name === item.name ? "active" : ""}`}
                          key={item.name}
                          onClick={() => setSelectedIndustry({ side: "strong", name: item.name })}
                        >
                          <b>{item.name}</b>
                          <span>▲ {item.avgChange.toFixed(2)}%｜領漲 {item.leader?.name || "--"}｜{item.up}漲/{item.down}跌</span>
                        </button>
                      )) : <p className="report-empty">強勢產業資料更新中。</p>}
                    </div>
                  </div>

                  <div className="report-card">
                    <div className="section-title">
                      <h2>📉 台股弱勢產業</h2>
                      <span className="muted">點選產業可查看相關股票</span>
                    </div>
                    <div className="industry-list">
                      {industryReport.weak.length ? industryReport.weak.map((item) => (
                        <button
                          type="button"
                          className={`industry-item down ${selectedIndustry?.side === "weak" && selectedIndustry?.name === item.name ? "active" : ""}`}
                          key={item.name}
                          onClick={() => setSelectedIndustry({ side: "weak", name: item.name })}
                        >
                          <b>{item.name}</b>
                          <span>▼ {item.avgChange.toFixed(2)}%｜領跌 {item.leader?.name || "--"}｜{item.up}漲/{item.down}跌</span>
                        </button>
                      )) : <p className="report-empty">弱勢產業資料更新中。</p>}
                    </div>
                  </div>

                  {selectedIndustryDetail && (
                    <div className="report-card industry-detail-card">
                      <div className="section-title">
                        <h2>
                          {selectedIndustry?.side === "weak" ? "📉" : "🔥"} {selectedIndustryDetail.name} 相關股票
                        </h2>
                        <span className="muted">
                          sourceB 成分股 {selectedIndustryDetail.totalMembers} 檔｜sourceC 已更新 {selectedIndustryDetail.stocks.filter((s) => Number.isFinite(s.changePct)).length} 檔｜{selectedIndustryDetail.up}漲/{selectedIndustryDetail.down}跌｜平均漲跌 {selectedIndustryDetail.avgChange.toFixed(2)}%
                        </span>
                      </div>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>股票</th>
                              <th>漲跌</th>
                              <th>成交量</th>
                              <th>官方產業</th>
                              <th>主題概念</th>
                              <th>強弱</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedIndustryDetail.stocks.map((s) => (
                              <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                                <td>
                                  <div className="stock-name-stack">
                                    <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                    <span className="stock-name-code">{s.symbol}</span>
                                  </div>
                                </td>
                                <td className={s.changePct >= 0 ? "up" : s.changePct < 0 ? "down" : ""}>{s.changePct?.toFixed?.(2) ?? "--"}{Number.isFinite(s.changePct) ? "%" : ""}</td>
                                <td>{Number(s.volume || s.history?.at?.(-1)?.volume || 0).toLocaleString()}</td>
                                <td><span className="badge">{s.officialIndustry || "--"}</span></td>
                                <td>{(s.themeTags || []).join("、") || "--"}</td>
                                <td><span className="badge">{s.changePct > 0 ? "強" : s.changePct < 0 ? "弱" : "待更新"}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "us" && (
                <div className="report-card">
                  <h2>🇺🇸 美股科技股觀察</h2>
                  {usTechWatchList.length === 0 ? (
                    <p className="report-empty">尚未有美股科技股資料。可將 NVDA、AAPL、TSLA、MSFT、META、AMD 加入自選後自動更新。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>AI分數</th><th>趨勢</th><th>觀察</th><th>量比</th></tr></thead>
                        <tbody>
                          {usTechWatchList.map((s) => (
                            <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.score ?? "--"}</td>
                              <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                              <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                              <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "macro" && (
                <div className="macro-grid">
                  <div className="macro-card">
                    <h3>💵 匯率 / 美元</h3>
                    <b>觀察外資方向</b>
                    <p>美元偏強時，外資對台股通常較保守；美元轉弱時，風險資產較容易回溫。</p>
                  </div>
                  <div className="macro-card">
                    <h3>📉 美國10年債</h3>
                    <b>觀察科技股壓力</b>
                    <p>殖利率走高時，科技成長股估值壓力提高；殖利率回落時有利科技股反彈。</p>
                  </div>
                  <div className="macro-card">
                    <h3>₿ BTC</h3>
                    <b>風險偏好指標</b>
                    <p>BTC 走強通常代表市場風險偏好提升；劇烈下跌時需留意科技股同步震盪。</p>
                  </div>
                  <div className="macro-card">
                    <h3>🧭 AI 總結</h3>
                    <b>{marketMoodText}</b>
                    <p>宏觀資料目前以文字規則提醒為主，後續可再接匯率、美債與 BTC 即時 API。</p>
                  </div>
                </div>
              )}

              {reportTab === "strength" && (
                <div className="report-card">
                  <div className="section-title">
                    <h2>🔥 今日強 / 弱勢股票 Top50</h2>
                    <span className="muted">依 AI 分數、漲跌幅、量比綜合排序，並自動彙整產業前五名</span>
                  </div>

                  <div className="report-grid" style={{ marginBottom: 12 }}>
                    <div className="report-card">
                      <h2>🏆 強勢產業前五名</h2>
                      <div className="industry-list">
                        {reportIndustryRank.strong.length ? reportIndustryRank.strong.map((item, index) => (
                          <div className="industry-item up" key={item.industry}>
                            <div>
                              <b>{index + 1}. {item.industry}</b>
                              <div className="muted">
                                平均漲幅 {item.avgChange.toFixed(2)}%｜平均AI {Math.round(item.avgScore)}｜平均量比 {item.avgVolumeRatio.toFixed(2)}
                              </div>
                              <div className="muted">
                                代表股：{item.topStocks.map((s) => `${getDisplayName(s.symbol, s.name)}(${s.symbol})`).join("、")}
                              </div>
                            </div>
                            <span>▲ 強勢</span>
                          </div>
                        )) : <p className="report-empty">強勢產業資料更新中。</p>}
                      </div>
                    </div>

                    <div className="report-card">
                      <h2>📉 弱勢產業前五名</h2>
                      <div className="industry-list">
                        {reportIndustryRank.weak.length ? reportIndustryRank.weak.map((item, index) => (
                          <div className="industry-item down" key={item.industry}>
                            <div>
                              <b>{index + 1}. {item.industry}</b>
                              <div className="muted">
                                平均漲幅 {item.avgChange.toFixed(2)}%｜平均AI {Math.round(item.avgScore)}｜平均量比 {item.avgVolumeRatio.toFixed(2)}
                              </div>
                              <div className="muted">
                                代表股：{item.topStocks.map((s) => `${getDisplayName(s.symbol, s.name)}(${s.symbol})`).join("、")}
                              </div>
                            </div>
                            <span>▼ 弱勢</span>
                          </div>
                        )) : <p className="report-empty">弱勢產業資料更新中。</p>}
                      </div>
                    </div>
                  </div>

                  <div className="report-grid">
                    <div className="report-card">
                      <h2>🔥 今日強勢股 Top50</h2>
                      {reportStrongTop50.length === 0 ? (
                        <p className="report-empty">強勢股資料更新中。</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>排名</th><th>股票</th><th>產業</th><th>AI</th><th>漲幅</th><th>量比</th><th>訊號</th></tr></thead>
                            <tbody>
                              {reportStrongTop50.map((s, index) => (
                                <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <div className="stock-name-stack">
                                      <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                      <span className="stock-name-code">{s.symbol}</span>
                                    </div>
                                  </td>
                                  <td><span className="badge">{s.baseType || s.strongType || (s.currency === "USD" ? "美股 / ETF" : "其他")}</span></td>
                                  <td>{s.score ?? "--"}</td>
                                  <td className="up">{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                                  <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                                  <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="report-card">
                      <h2>📉 今日弱勢股 Top50</h2>
                      {reportWeakTop50.length === 0 ? (
                        <p className="report-empty">弱勢股資料更新中。</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>排名</th><th>股票</th><th>產業</th><th>AI</th><th>跌幅</th><th>量比</th><th>訊號</th></tr></thead>
                            <tbody>
                              {reportWeakTop50.map((s, index) => (
                                <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <div className="stock-name-stack">
                                      <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                      <span className="stock-name-code">{s.symbol}</span>
                                    </div>
                                  </td>
                                  <td><span className="badge">{s.baseType || s.strongType || (s.currency === "USD" ? "美股 / ETF" : "其他")}</span></td>
                                  <td>{s.score ?? "--"}</td>
                                  <td className="down">{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                                  <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                                  <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {reportTab === "nextday" && (
                <div className="report-card">
                  <h2>🌙 隔日沖候選股</h2>
                  {reportNextDayCandidates.length === 0 ? (
                    <p className="report-empty">隔日沖候選資料更新中。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>分數</th><th>開高率</th><th>訊號</th><th>假突破</th></tr></thead>
                        <tbody>
                          {reportNextDayCandidates.map((s) => (
                            <tr key={s.symbol} onClick={() => openStockAnalysisFromList(s)}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.nextDay?.nextDayScore ?? "--"}</td>
                              <td>{s.nextDay?.gapUpProbability ?? "--"}%</td>
                              <td><span className="badge">{s.nextDay?.nextDaySignal || "觀望"}</span></td>
                              <td className={s.nextDay?.fakeBreakout ? "down" : "up"}>{s.nextDay?.fakeBreakout ? "有風險" : "通過"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "daytrade" && (
                <div className="report-card">
                  <h2>⚡ 當沖觀察股</h2>
                  {reportDayTradeCandidates.length === 0 ? (
                    <p className="report-empty">當沖觀察資料更新中。可先執行當沖排行榜或等待背景更新。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>即時分數</th><th>訊號</th><th>進場價</th><th>停損 / 停利</th></tr></thead>
                        <tbody>
                          {reportDayTradeCandidates.map((s) => (
                            <tr key={s.symbol} onClick={() => { setIntradayStock(s); setStock(s); setActiveMenu("daytrade"); }}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.dayTrade?.score ?? "--"}</td>
                              <td><span className="badge">{s.dayTrade?.signal || "觀察"}</span></td>
                              <td>{s.dayTrade?.entry?.toFixed?.(2) ?? "--"}</td>
                              <td>{s.dayTrade?.stopLoss?.toFixed?.(2) ?? "--"} / {s.dayTrade?.takeProfit?.toFixed?.(2) ?? "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}


              {reportTab === "news" && (
                <NewsTab API_BASE={API_BASE} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}