import { NextRequest, NextResponse } from 'next/server';
import { sendMetaConversionEvent, SendMetaEventParams } from '@/services/meta-conversions.service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendMetaEventParams>;

    if (!body.eventName) {
      return NextResponse.json(
        { success: false, error: 'eventName is required' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const fbp = req.cookies.get('_fbp')?.value;
    const fbc = req.cookies.get('_fbc')?.value;

    const userData = {
      ...body.userData,
      clientIpAddress: ip || body.userData?.clientIpAddress,
      clientUserAgent: userAgent || body.userData?.clientUserAgent,
      fbp: fbp || body.userData?.fbp,
      fbc: fbc || body.userData?.fbc,
    };

    const result = await sendMetaConversionEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      eventTime: body.eventTime,
      eventSourceUrl: body.eventSourceUrl || req.headers.get('referer') || undefined,
      userData,
      customData: body.customData,
      actionSource: body.actionSource || 'website',
    });

    return NextResponse.json(result, { status: result.success ? 200 : 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
