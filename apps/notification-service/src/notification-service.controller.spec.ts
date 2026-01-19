import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';
import { EmailService } from './email/email.service';

describe('NotificationServiceController', () => {
  let controller: NotificationServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
      providers: [
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationServiceController>(
      NotificationServiceController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
