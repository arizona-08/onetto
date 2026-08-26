import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService
  ) {}

  async findAll(){
    return this.prismaService.user.findMany();
  }

  async create(data: CreateUserDto){
    try {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: data.email }
      });

      if(existingUser){
        throw new BadRequestException("Email already in use.");
      }

      if(data.password !== data.confirmationPassword){
        throw new BadRequestException("Passwords do not match.");
      }

      const hashedPassword = await argon2.hash(data.password);

      const createdUser = await this.prismaService.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            password: hashedPassword,
            subscriptionPlan: 'FREE',
          },
        });

        await prisma.userSubscription.create({
          data: {
            userId: user.id,
            subscriptionPlan: 'FREE',
            isActive: true,
          },
        });

        return user;
      });

      const { password, ...userWithoutPassword } = createdUser;

      return {
        message: "User created successfully.",
        user: userWithoutPassword
      }
      
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException("An unexpected error occured while creating the user.", error instanceof Error ? error.message : undefined);
    }
    
  }

  async findBy(search: 'email' | 'id', value: string){
    try{
      const user = await this.prismaService.user.findFirst({
        where: { [search]: value }
      });

      if(!user){
        throw new BadRequestException(`User with ${search} ${value} not found.`);
      }

      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error: any) {
      throw new InternalServerErrorException(`An unexpected error occured while retrieving the user with ${search}: ${value}`, error instanceof Error ? error.message : undefined)
    }
  }
}
