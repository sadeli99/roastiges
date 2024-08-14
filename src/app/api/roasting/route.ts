import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Inisialisasi Google Generative AI dengan kunci API dari lingkungan
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

// Fungsi utama yang menangani permintaan POST untuk melakukan roasting
export async function POST(request: Request) {
  // Ambil data JSON dari permintaan, termasuk username dan profil
  const { username, profile } = await request.json();
  
  // Jika username atau profil tidak disertakan, kembalikan respons 400 (Bad Request)
  if (!username || !profile) {
    return NextResponse.json(
      { message: "Username and profile data are required" },
      { status: 400 }
    );
  }
  
  // Hapus avatar dari data profil karena tidak diperlukan
  delete profile.profile_pic_url;
  
  // Format data profil menjadi string biodata yang dapat digunakan dalam prompt
  const biodata = formatData(profile);

  try {
    // Buat prompt roasting menggunakan biodata dalam bahasa Indonesia
    const prompt = `Berikan roasting singkat dengan kejam, menyindir, serta menyakitkan dalam bahasa gaul untuk profile Instagram berikut : ${username}. Berikut detailnya: ${biodata}`;
    prompt += `(berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran)`;

    // Konfigurasi pengaturan keamanan untuk mencegah konten yang tidak diinginkan
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
    
    // Kembalikan hasil roasting dalam format JSON
    return NextResponse.json({ roasting: response.text() });
  } catch (error) {
    // Jika terjadi kesalahan saat menghasilkan roasting, log error dan kembalikan respons 500 (Internal Server Error)
    console.error("Error generating roast:", error);
    return NextResponse.json(
      { message: "Error generating roast" },
      { status: 500 }
    );
  }
}
