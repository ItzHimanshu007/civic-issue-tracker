import { NextRequest, NextResponse } from 'next/server';

const STATUSES = ['SUBMITTED','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED'] as const;
const PRIORITIES = ['NORMAL','URGENT','CRITICAL'] as const;
const CATEGORIES = ['POTHOLE','STREETLIGHT','GARBAGE','WATER_LEAK','SEWAGE','ROAD_MAINTENANCE','TRAFFIC_SIGNAL','PARK_MAINTENANCE','NOISE_POLLUTION','OTHER'] as const;

// In-memory store for reports submitted from mobile app
const userSubmittedReports: any[] = [];

interface CreateReportRequest {
  title: string;
  description: string;
  category: typeof CATEGORIES[number];
  priority: typeof PRIORITIES[number];
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  images?: string[];
  videos?: string[];
  audioNotes?: string[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as (typeof STATUSES)[number] | null;
  const category = searchParams.get('category') as (typeof CATEGORIES)[number] | null;
  const limit = Number(searchParams.get('limit') || '50');
  const offset = Number(searchParams.get('offset') || '0');

  // Filter user-submitted reports based on query params
  let filteredUserReports = userSubmittedReports.filter(report => {
    if (status && report.status !== status) return false;
    if (category && report.category !== category) return false;
    return true;
  });

  const total = 1000;
  const mockItems: any[] = [];
  const now = Date.now();
  for (let i = 0; i < total; i++) {
    const st = STATUSES[i % STATUSES.length];
    const pr = PRIORITIES[i % PRIORITIES.length];
    const cat = CATEGORIES[i % CATEGORIES.length];
    if (status && status !== st) continue;
    if (category && category !== cat) continue;

    const jharkhandLocations = [
      { lat: 23.3441, lng: 85.3096, addr: 'Main Road, Ranchi, Jharkhand' },
      { lat: 23.3569, lng: 85.3094, addr: 'Morabadi, Ranchi, Jharkhand' },
      { lat: 23.4241, lng: 85.4419, addr: 'Gonda Hill, Ranchi, Jharkhand' },
      { lat: 23.3615, lng: 85.3203, addr: 'Upper Bazaar, Ranchi, Jharkhand' },
      { lat: 22.7596, lng: 86.1517, addr: 'Jamshedpur, Jharkhand' },
      { lat: 24.6340, lng: 85.0863, addr: 'Dhanbad, Jharkhand' },
      { lat: 23.6739, lng: 85.3294, addr: 'Hatia, Ranchi, Jharkhand' },
      { lat: 23.8103, lng: 86.4074, addr: 'Deoghar, Jharkhand' }
    ];
    const loc = jharkhandLocations[i % jharkhandLocations.length];
    const titles = {
      'POTHOLE': [`सड़क पर बड़ा गड्ढा #${i + 1}`, `Road pothole issue #${i + 1}`],
      'STREETLIGHT': [`स्ट्रीट लाइट की समस्या #${i + 1}`, `Streetlight problem #${i + 1}`],
      'GARBAGE': [`कूड़े की समस्या #${i + 1}`, `Garbage issue #${i + 1}`],
      'WATER_LEAK': [`पानी का रिसाव #${i + 1}`, `Water leak #${i + 1}`],
      'SEWAGE': [`नाली की समस्या #${i + 1}`, `Sewage problem #${i + 1}`],
      'ROAD_MAINTENANCE': [`सड़क मरम्मत #${i + 1}`, `Road repair needed #${i + 1}`],
      'TRAFFIC_SIGNAL': [`ट्रैफिक सिग्नल खराब #${i + 1}`, `Traffic signal fault #${i + 1}`],
      'PARK_MAINTENANCE': [`पार्क की मरम्मत #${i + 1}`, `Park maintenance #${i + 1}`],
      'NOISE_POLLUTION': [`शोर की समस्या #${i + 1}`, `Noise complaint #${i + 1}`],
      'OTHER': [`अन्य समस्या #${i + 1}`, `Other issue #${i + 1}`]
    };
    mockItems.push({
      id: `mock-${i + 1}`,
      title: titles[cat] ? titles[cat][i % 2] : `${cat.replace('_',' ')} issue #${i + 1}`,
      description: `Jharkhand civic issue report ${i + 1} - समुदायिक समस्या की रिपोर्ट`,
      category: cat,
      priority: pr,
      status: st,
      latitude: loc.lat + (Math.random() - 0.5) * 0.01,
      longitude: loc.lng + (Math.random() - 0.5) * 0.01,
      address: `${loc.addr} ${834001 + (i % 10)}`,
      upvotes: Math.floor(Math.random() * 50),
      created_at: new Date(now - i * 60_000).toISOString(),
    });
  }

  // Combine user reports (newest first) with mock data
  const allItems = [...filteredUserReports.reverse(), ...mockItems];
  const data = allItems.slice(offset, offset + limit);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateReportRequest = await req.json();
    
    // Validate required fields
    if (!body.title || !body.description || !body.category || !body.priority || !body.location || !body.address) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate category and priority
    if (!CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      );
    }
    
    if (!PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { success: false, message: 'Invalid priority' },
        { status: 400 }
      );
    }
    
    // Create new report
    const newReport = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      status: 'SUBMITTED' as const,
      latitude: body.location.latitude,
      longitude: body.location.longitude,
      address: body.address,
      upvotes: 0,
      created_at: new Date().toISOString(),
      // Mock user data for now
      userId: 'mobile-user-1',
      user: {
        id: 'mobile-user-1',
        name: 'रमेश कुमार',
        phoneNumber: '+91-9876543215',
        email: 'ramesh.mobile@gmail.com',
        isVerified: true,
        points: 150,
        badges: [],
        createdAt: new Date().toISOString(),
      },
      hasUserUpvoted: false,
      comments: [],
      updatedAt: new Date().toISOString(),
      // Media files (for now just store as metadata)
      images: body.images || [],
      videos: body.videos || [],
      audioNotes: body.audioNotes || [],
    };
    
    // Add to in-memory store
    userSubmittedReports.push(newReport);
    
    console.log(`New report created from mobile app: ${newReport.title} (ID: ${newReport.id})`);
    
    return NextResponse.json(
      { success: true, data: { id: newReport.id, createdAt: newReport.created_at } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create report' },
      { status: 500 }
    );
  }
}

