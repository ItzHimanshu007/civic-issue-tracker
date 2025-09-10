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

    mockItems.push({
      id: `mock-${i + 1}`,
      title: `${cat.replace('_',' ')} issue #${i + 1}`,
      description: `Auto-generated mock report ${i + 1} for frontend testing (Next API).`,
      category: cat,
      priority: pr,
      status: st,
      latitude: 40.5 + (i % 100) * 0.005,
      longitude: -74.2 + (i % 100) * 0.005,
      address: `${100 + (i % 900)} Main St, Cityville`,
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
        name: 'Mobile App User',
        phoneNumber: '+1234567890',
        email: 'mobile@example.com',
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

