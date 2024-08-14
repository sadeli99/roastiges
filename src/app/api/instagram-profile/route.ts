import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { message: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const profile = await getInstagramProfile(username);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return NextResponse.json(
      { message: "Error fetching Instagram profile" },
      { status: 500 }
    );
  }
}

async function getInstagramProfile(username: string) {
  const profileUrl = `https://gramsnap.com/api/ig/userInfoByUsername/${username}`;
  const response = await axios.get(profileUrl);
  
  const result = response.data?.result?.user;

  if (!result) {
    throw new Error('Pengguna tidak ditemukan');
  }

  const profile: any = {
    full_name: result.full_name,
    username: result.username,
    biography: result.biography,
    is_private: result.is_private,
    followers: result.follower_count,
    following: result.following_count,
    jumlah_postingan: result.media_count, // Menambahkan jumlah postingan
  };

  // Ambil URL gambar profil dengan tanda tangan dan masa berlaku
  const hdProfilePicUrlInfo = result.hd_profile_pic_url_info;
  if (hdProfilePicUrlInfo) {
    const { url, url_signature } = hdProfilePicUrlInfo;
    const signedUrl = `https://media.gramsnap.com/get?uri=${encodeURIComponent(url)}&__sig=${url_signature.signature}&__expires=${url_signature.expires}`;
    profile.profile_pic_url = signedUrl;
  } else {
    profile.profile_pic_url = null; // Jika tidak ada data gambar profil
  }

  return profile;
}
