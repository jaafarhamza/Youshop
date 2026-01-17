import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

// Define Interface for Request with rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

@ApiTags('payments')
@Controller('payment')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RequestWithRawBody,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException(
        'Raw body not available. Ensure rawBody: true in main.ts',
      );
    }

    await this.paymentService.handleWebhookEvent(signature, request.rawBody);
    return { received: true };
  }
}
