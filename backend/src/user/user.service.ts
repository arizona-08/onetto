import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import argon2 from "argon2";

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

      const createdUser = await this.prismaService.user.create({
        data: {
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          password: hashedPassword
        }
      });

      const { password, ...userWithoutPassword } = createdUser;

      return {
        message: "User created successfully.",
        user: userWithoutPassword
      }
      
    } catch (error: unknown) {
      throw new InternalServerErrorException("An unexpected error occured while creating the user.", error instanceof Error ? error.message : undefined);
    }
    
  }
}