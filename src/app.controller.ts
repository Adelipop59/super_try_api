import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Page d\'accueil', description: 'Retourne un message de bienvenue' })
  @ApiResponse({ status: 200, description: 'Message de bienvenue' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Vérifie que l\'API est opérationnelle' })
  @ApiResponse({ status: 200, description: 'Service opérationnel' })
  getHealth() {
    return {
      status: 'ok',
      message: 'Super Try API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
