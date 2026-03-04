import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  Query,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PropertyService } from './property.service';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import {
  CreatePropertyDto,
  CreateUnitDto,
  UpdatePropertyDto,
  UpdateUnitDto,
  UpdatePropertyMarketingDto,
  PropertySearchQueryDto,
  SavePropertyFilterDto,
} from './dto/property.dto';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    role: Role;
  };
}

@Controller(['properties', 'property'])
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @HttpCode(HttpStatus.CREATED)
  createProperty(@Body() dto: CreatePropertyDto, @OrgId() orgId: string) {
    return this.propertyService.createProperty(dto, orgId);
  }

  @Post(':id/units')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @HttpCode(HttpStatus.CREATED)
  createUnit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateUnitDto,
    @OrgId() orgId: string,
  ) {
    return this.propertyService.createUnit(propertyId, dto, orgId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getAllProperties(@OrgId() orgId: string) {
    return this.propertyService.getAllProperties(orgId);
  }

  @Get('public')
  getPublicProperties() {
    return this.propertyService.getAllProperties();
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  searchProperties(@Query() query: PropertySearchQueryDto, @OrgId() orgId: string) {
    return this.propertyService.searchProperties(query, orgId);
  }

  @Get('public/search')
  getPublicSearch(@Query() query: PropertySearchQueryDto) {
    return this.propertyService.searchProperties(query);
  }

  @Get('saved-filters')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getSavedFilters(@Request() req: AuthenticatedRequest) {
    return this.propertyService.getSavedFilters(req.user.userId);
  }

  @Post('saved-filters')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  saveFilter(@Body() dto: SavePropertyFilterDto, @Request() req: AuthenticatedRequest) {
    return this.propertyService.savePropertyFilter(req.user.userId, dto);
  }

  @Delete('saved-filters/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFilter(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.propertyService.deleteSavedFilter(req.user.userId, id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getPropertyById(@Param('id', ParseUUIDPipe) id: string, @OrgId() orgId: string) {
    return this.propertyService.getPropertyById(id, orgId);
  }

  @Get(':id/marketing')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'OWNER')
  getMarketingProfile(@Param('id', ParseUUIDPipe) id: string, @OrgId() orgId: string) {
    return this.propertyService.getMarketingProfile(id, orgId);
  }

  @Post(':id/marketing')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  updateMarketingProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyMarketingDto,
    @OrgId() orgId: string,
  ) {
    return this.propertyService.updateMarketingProfile(id, dto, orgId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  updateProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @OrgId() orgId: string,
  ) {
    return this.propertyService.updateProperty(id, dto, orgId);
  }

  @Patch(':id/units/:unitId')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  updateUnit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: UpdateUnitDto,
    @OrgId() orgId: string,
  ) {
    return this.propertyService.updateUnit(propertyId, unitId, dto, orgId);
  }
}
