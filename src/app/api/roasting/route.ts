import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Inisialisasi Google Generative AI dengan kunci API dari lingkungan
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Konfigurasi Rate Limiter untuk membatasi jumlah permintaan per IP
const rateLimiter = new RateLimiterMemory({
  points: 100, // Maksimal 5 permintaan per 720 detik (12 menit)
  duration: 180, // Durasi dalam detik untuk reset limit
});

// Fungsi untuk memformat data profil pengguna menjadi string yang mudah dibaca
const formatData = (objs: {}) => {
  let biodata = "";
  const obj = objs as { [key: string]: any };
  
  // Iterasi setiap kunci dalam objek profil pengguna
  Object.keys(obj).forEach((key) => {
    // Ubah kunci menjadi format yang lebih manusiawi (misalnya, ubah "_" menjadi spasi)
    const title = key.replace(/_/g, " ");
    let value = `${obj[key]}`;
    
    // Format judul dan tambahkan ke string biodata
    if (title) {
      biodata += `${title[0].toUpperCase() + title.slice(1)}: ${value}`;
    } else {
      biodata += `${title}: ${value}`;
    }
    
    // Tambahkan baris baru setelah setiap pasangan kunci-nilai
    biodata += "\n";
  });
  return biodata;
};

// Fungsi utama yang menangani permintaan GET untuk melakukan roasting
export async function GET(request: Request) {
  // Mendapatkan IP klien dari header permintaan
  const clientIp = request.headers.get("x-forwarded-for");
  
  // Jika IP klien ditemukan, coba konsumsi limit rate untuk IP tersebut
  if (clientIp) {
    try {
      await rateLimiter.consume(clientIp);
    } catch (error) {
      // Jika limit tercapai, kembalikan respons 429 (Too Many Requests)
      return NextResponse.json(
        { message: "Too many requests, please try again later." },
        { status: 429 }
      );
    }
  } else {
    // Jika IP klien tidak valid atau tidak ditemukan, kembalikan respons 400 (Bad Request)
    return NextResponse.json(
      { message: "Invalid client IP." },
      { status: 400 }
    );
  }

  // Ambil parameter dari URL query
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const biodataParam = url.searchParams.get("biodata");
  const language = url.searchParams.get("language");
  
  // Jika username atau biodata tidak disertakan, kembalikan respons 400 (Bad Request)
  if (!username || !biodataParam) {
    return NextResponse.json(
      { message: "Username and biodata are required" },
      { status: 400 }
    );
  }
  
  // Parse biodata dari string JSON
  let profile;
  try {
    profile = JSON.parse(biodataParam);
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid biodata format" },
      { status: 400 }
    );
  }
  
  // Hapus avatar dari data profil karena tidak diperlukan
  delete profile.avatar;
  
  // Format data profil menjadi string biodata yang dapat digunakan dalam prompt
  const biodata = formatData(profile);

  try {
    let prompt = "";

    // Tentukan prompt berdasarkan bahasa yang dipilih
    switch (language) {
      case "indonesian":
        prompt = `Berikan roasting singkat dengan kejam, menyindir, serta menyakitkan dalam bahasa gaul untuk profile Instagram berikut : ${username}. Berikut detailnya: ${biodata}`;
        prompt += `(berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran)`;
        break;
      case "english":
        prompt = `Give a short and harsh roasting in a brutal, sarcastic, and hurtful manner for the following Instagram profile: ${username}. Here are the details: ${biodata}`;
        prompt += `(provide the response in English and do not give any compliments or advice)`;
        break;
      case "mandarin":
        prompt = `请用中文为以下Tiktok个人资料进行简短而残酷、讽刺且尖锐的吐槽：${username}。以下是详细信息：${biodata}`;
        prompt += `(请用中文回答，不要给出任何赞美或建议)`;
        break;
      case "japanese":
        prompt = `次のTiktokプロフィールに対して、残酷で皮肉で痛烈な短いローストを日本語でしてください: ${username}。詳細はこちら: ${biodata}`;
        prompt += `(日本語で応答し、褒め言葉やアドバイスはしないでください)`;
        break;
      case "korean":
        prompt = `다음 Tiktok 프로필에 대해 짧고 가혹한 한국어로 잔인하고 비꼬며 상처 주는 로스트를 해주세요: ${username}。세부 정보는 다음과 같습니다: ${biodata}`;
        prompt += `(응답은 한국어로 제공하고 칭찬이나 조언은 하지 마세요)`;
        break;
      case "vietnamese":
        prompt = `Hãy đưa ra một lời nhận xét ngắn gọn nhưng tàn nhẫn, mỉa mai và gây tổn thương bằng tiếng Việt cho hồ sơ Instagram sau: ${username}. Đây là chi tiết: ${biodata}`;
        prompt += `(cung cấp phản hồi bằng tiếng Việt và không đưa ra bất kỳ lời khen ngợi hoặc lời khuyên nào)`;
        break;
      case "filipino":
        prompt = `Magbigay ng maikli ngunit malupit, mapanuyang, at masakit na roasting sa Filipino para sa sumusunod na profile ng Instagram: ${username}. Narito ang mga detalye: ${biodata}`;
        prompt += `(magbigay ng tugon sa Filipino at huwag magbigay ng anumang papuri o payo)`;
        break;
      default:
        prompt = `Berikan roasting singkat dengan kejam, menyindir, serta menyakitkan dalam bahasa gaul untuk profile Instagram berikut : ${username}. Berikut detailnya: ${biodata}`;
        prompt += `(berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran)`;
    }

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    // Dapatkan model generatif dari Google Generative AI dengan pengaturan keamanan yang ditentukan
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings,
    });

    // Buat konten berdasarkan prompt yang telah dibuat
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Kembalikan hasil roasting dalam format JSON dengan header CORS
    const responseHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    return NextResponse.json({ roasting: response.text() }, { headers: responseHeaders });
  } catch (error) {
    // Jika terjadi kesalahan saat menghasilkan roasting, log error dan kembalikan respons 500 (Internal Server Error)
    console.error("Error generating roast:", error);
    return NextResponse.json(
      { message: "Error generating roast" },
      { status: 500 }
    );
  }
}
