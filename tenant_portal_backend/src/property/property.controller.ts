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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PropertyService } from './property.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
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
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  createProperty(@Body() dto: CreatePropertyDto) {
    return this.propertyService.createProperty(dto);
  }

  @Post(':id/units')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  createUnit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.propertyService.createUnit(propertyId, dto.name);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getAllProperties() {
    return this.propertyService.getAllProperties();
  }

  @Get('public')
  getPublicProperties() {
    return this.propertyService.getAllProperties();
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  searchProperties(@Query() query: PropertySearchQueryDto) {
    return this.propertyService.searchProperties(query);
  }

  @Get('public/search')
  getPublicSearch(@Query() query: PropertySearchQueryDto) {
    return this.propertyService.searchProperties(query);
  }

  @Get('saved-filters')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getSavedFilters(@Request() req: AuthenticatedRequest) {
    return this.propertyService.getSavedFilters(req.user.userId);
  }

  @Post('saved-filters')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  saveFilter(@Body() dto: SavePropertyFilterDto, @Request() req: AuthenticatedRequest) {
    return this.propertyService.savePropertyFilter(req.user.userId, dto);
  }

  @Delete('saved-filters/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFilter(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.propertyService.deleteSavedFilter(req.user.userId, id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getPropertyById(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertyService.getPropertyById(id);
  }

  @Get(':id/marketing')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getMarketingProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertyService.getMarketingProfile(id);
  }

  @Post(':id/marketing')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  updateMarketingProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyMarketingDto,
  ) {
    return this.propertyService.updateMarketingProfile(id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  updateProperty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.updateProperty(id, dto);
  }

  @Patch(':id/units/:unitId')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles(Role.PROPERTY_MANAGER)
  updateUnit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.propertyService.updateUnit(propertyId, unitId, dto);
  }
}
