import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { createListingAPI } from '../services/api'
import {
  marketplaceCategoryLabels,
  getMarketplaceSubcategories,
  type MarketplaceMainCategory,
} from '../constants/goimagineCategories'

interface FormErrors {
  title?: string
  price?: string
  description?: string
}

export default function CreateListingScreen() {
  const router = useRouter()
  const defaultMainCategory = marketplaceCategoryLabels[0] as MarketplaceMainCategory
  const defaultSubCategory = getMarketplaceSubcategories(defaultMainCategory)[0] || ''
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [mainCategory, setMainCategory] = useState<MarketplaceMainCategory>(defaultMainCategory)
  const [subCategory, setSubCategory] = useState(defaultSubCategory)
  const [mainCategoryOpen, setMainCategoryOpen] = useState(false)
  const [subCategoryOpen, setSubCategoryOpen] = useState(false)
  const [distanceOrigin, setDistanceOrigin] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isNegotiable, setIsNegotiable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [success, setSuccess] = useState(false)

  const subcategoryOptions = useMemo(
    () => getMarketplaceSubcategories(mainCategory),
    [mainCategory]
  )

  useEffect(() => {
    if (!subcategoryOptions.includes(subCategory)) {
      setSubCategory(subcategoryOptions[0] || '')
    }
  }, [mainCategory, subCategory, subcategoryOptions])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    } else if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    if (!price.trim()) {
      newErrors.price = 'Price is required'
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      newErrors.price = 'Enter a valid price'
    } else if (parseFloat(price) > 1000000) {
      newErrors.price = 'Price seems too high'
    }

    if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to add images.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      base64: true,
    })

    if (result.canceled) return

    const pickedImages = result.assets
      .map((asset) => {
        if (asset.base64) {
          return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        }
        return asset.uri
      })
      .filter(Boolean)

    setImages((current) => [...current, ...pickedImages])
  }

  const removeImage = (imageUri: string) => {
    setImages((current) => current.filter((item) => item !== imageUri))
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    setSuccess(false)

    try {
      const result = await createListingAPI({
        title,
        description,
        price: parseFloat(price),
        distance_km: 0,
        distance_origin: distanceOrigin.trim() || undefined,
        condition_rating: 1,
        images,
        main_category: mainCategory,
        subcategory: subCategory,
        specifications: {
          main_category: mainCategory,
          subcategory: subCategory,
          negotiable: isNegotiable,
          distance_origin: distanceOrigin.trim() || 'Unknown',
        },
        seller_id: 'manual_post',
        negotiation_logic: isNegotiable ? 'standard' : 'strict',
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create listing')
      }

      setSuccess(true)
      setTitle('')
      setDescription('')
      setPrice('')
      setMainCategory(defaultMainCategory)
      setSubCategory(defaultSubCategory)
      setMainCategoryOpen(false)
      setSubCategoryOpen(false)
      setDistanceOrigin('')
      setImages([])
      setErrors({})

      // Navigate to marketplace after success
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      Alert.alert('Error', 'Failed to create listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>CREATE LISTING</Text>
      <Text style={styles.subheader}>
        Post a new listing to the marketplace
      </Text>

      {/* Success Message */}
      {success && (
        <View style={styles.successBox}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Listing created successfully!</Text>
        </View>
      )}

      {/* Images */}
      <View style={styles.field}>
        <Text style={styles.label}>IMAGES</Text>
        <Pressable style={styles.uploadBtn} onPress={pickImages}>
          <Text style={styles.uploadBtnText}>ADD IMAGES</Text>
        </Pressable>
        {images.length > 0 && (
          <View style={styles.imageGrid}>
            {images.map((imageUri) => (
              <Pressable key={imageUri} style={styles.imageThumbWrap} onPress={() => removeImage(imageUri)}>
                <Image source={{ uri: imageUri }} style={styles.imageThumb} />
                <View style={styles.imageThumbRemove}>
                  <Text style={styles.imageThumbRemoveText}>✕</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>TITLE *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="e.g., Industrial GPU Node V3"
          placeholderTextColor="#8f9095"
          value={title}
          onChangeText={(text) => {
            setTitle(text)
            if (errors.title) setErrors({ ...errors, title: undefined })
          }}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description && styles.inputError]}
          placeholder="Describe your offering..."
          placeholderTextColor="#8f9095"
          value={description}
          onChangeText={(text) => {
            setDescription(text)
            if (errors.description) setErrors({ ...errors, description: undefined })
          }}
          multiline
          numberOfLines={4}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      {/* Price */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 2, marginRight: 12 }]}>
          <Text style={styles.label}>PRICE ($) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="0.00"
            placeholderTextColor="#8f9095"
            value={price}
            onChangeText={(text) => {
              setPrice(text)
              if (errors.price) setErrors({ ...errors, price: undefined })
            }}
            keyboardType="decimal-pad"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>NEGOTIABLE</Text>
          <View style={styles.switchContainer}>
            <Switch
              value={isNegotiable}
              onValueChange={setIsNegotiable}
              trackColor={{ false: '#8f9095', true: '#00e1ab' }}
              thumbColor={isNegotiable ? '#fff' : '#dae2fd'}
            />
          </View>
        </View>
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.dropdownStack}>
          <Pressable style={styles.dropdownTrigger} onPress={() => setMainCategoryOpen((current) => !current)}>
            <View>
              <Text style={styles.dropdownTriggerLabel}>Main Category</Text>
              <Text style={styles.dropdownTriggerValue}>{mainCategory}</Text>
            </View>
            <Text style={styles.dropdownChevron}>{mainCategoryOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {mainCategoryOpen && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {marketplaceCategoryLabels.map((label, index) => (
                  <Pressable
                    key={`${label}-${index}`}
                    style={[styles.dropdownItem, label === mainCategory && styles.dropdownItemActive]}
                    onPress={() => {
                      setMainCategory(label as MarketplaceMainCategory)
                      setMainCategoryOpen(false)
                      setSubCategoryOpen(true)
                    }}
                  >
                    <Text style={[styles.dropdownItemText, label === mainCategory && styles.dropdownItemTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Pressable style={styles.dropdownTrigger} onPress={() => setSubCategoryOpen((current) => !current)}>
            <View>
              <Text style={styles.dropdownTriggerLabel}>Subcategory</Text>
              <Text style={styles.dropdownTriggerValue}>{subCategory || 'Select a subcategory'}</Text>
            </View>
            <Text style={styles.dropdownChevron}>{subCategoryOpen ? '▴' : '▾'}</Text>
          </Pressable>
          {subCategoryOpen && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {subcategoryOptions.map((label, index) => (
                  <Pressable
                    key={`${label}-${index}`}
                    style={[styles.dropdownItem, label === subCategory && styles.dropdownItemActive]}
                    onPress={() => {
                      setSubCategory(label)
                      setSubCategoryOpen(false)
                    }}
                  >
                    <Text style={[styles.dropdownItemText, label === subCategory && styles.dropdownItemTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.helperText}>Goimagine-style category selection: choose the main category, then a matching subcategory.</Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.label}>DISTANCE ORIGIN</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Aarhus, Denmark"
          placeholderTextColor="#8f9095"
          value={distanceOrigin}
          onChangeText={setDistanceOrigin}
        />
        <Text style={styles.helperText}>Used as the reference point for distance in the marketplace.</Text>
      </View>

      {/* Submit */}
      <Pressable
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#002f65" />
        ) : (
          <Text style={styles.submitBtnText}>POST LISTING</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.cancelBtn}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.cancelBtnText}>CANCEL</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    fontFamily: 'Space Grotesk',
    fontSize: 28,
    fontWeight: '700',
    color: '#abc7ff',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subheader: {
    color: '#8f9095',
    fontSize: 14,
    marginBottom: 32,
  },
  // Success
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#00e1ab',
  },
  successIcon: {
    fontSize: 20,
    color: '#00e1ab',
    marginRight: 12,
  },
  successText: {
    color: '#00e1ab',
    fontSize: 14,
    fontWeight: '600',
  },
  // Fields
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#131b2e',
    padding: 16,
    fontSize: 16,
    color: '#dae2fd',
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
  },
  inputError: {
    borderBottomColor: '#ffb4ab',
    backgroundColor: 'rgba(255, 180, 171, 0.05)',
  },
  errorText: {
    color: '#ffb4ab',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    color: '#8f9095',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  switchContainer: {
    backgroundColor: '#131b2e',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
    alignItems: 'flex-start',
  },
  uploadBtn: {
    backgroundColor: '#131b2e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#abc7ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imageThumbWrap: {
    position: 'relative',
  },
  imageThumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#131b2e',
  },
  imageThumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageThumbRemoveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  helperText: {
    color: '#8f9095',
    fontSize: 11,
    marginTop: 6,
  },
  dropdownStack: {
    gap: 8,
  },
  dropdownTrigger: {
    backgroundColor: '#131b2e',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerLabel: {
    color: '#8f9095',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dropdownTriggerValue: {
    color: '#dae2fd',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    paddingRight: 12,
  },
  dropdownChevron: {
    color: '#abc7ff',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownMenu: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#222a3d',
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222a3d',
  },
  dropdownItemActive: {
    backgroundColor: '#131b2e',
  },
  dropdownItemText: {
    color: '#dae2fd',
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: '#abc7ff',
  },
  // Buttons
  submitBtn: {
    backgroundColor: '#abc7ff',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 4,
    marginTop: 24,
  },
  submitBtnText: {
    color: '#002f65',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: {
    color: '#8f9095',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
})
