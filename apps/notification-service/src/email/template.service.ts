import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir = path.join(__dirname, '..', 'templates');

  compileTemplate(templateName: string, context: unknown): string {
    try {
      // Try multiple possible locations for templates in dist folder
      const possiblePaths = [
        path.join(__dirname, '..', 'templates', `${templateName}.hbs`),
        path.join(__dirname, '..', 'src', 'templates', `${templateName}.hbs`),
        path.join(
          process.cwd(),
          'apps',
          'notification-service',
          'src',
          'templates',
          `${templateName}.hbs`,
        ),
      ];

      let templatePath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          templatePath = p;
          break;
        }
      }

      if (!templatePath) {
        this.logger.error(
          `Template not found. Checked paths: ${possiblePaths.join(', ')}`,
        );
        throw new InternalServerErrorException(
          `Email template ${templateName} not found`,
        );
      }

      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      return template(context);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to compile template ${templateName}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
